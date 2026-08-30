import express from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { sendCode, verifyCode } from '../lib/otp.js';
import {
  COOKIE_NAME,
  clearSessionCookie,
  createSession,
  deleteSession,
  setSessionCookie,
} from '../lib/sessions.js';
import {
  checkEmail,
  checkName,
  checkOtp,
  checkPassword,
  checkPhone,
  keepOnlyDigits,
} from '../lib/validate.js';

/*
  routes/auth.js
  --------------
  Everything to do with getting in and out of an account.

    POST /api/auth/signup      make an account with an email and password
    POST /api/auth/login       sign in with that email and password
    POST /api/auth/otp/send    text a six digit code to a mobile number
    POST /api/auth/otp/verify  check the code, and sign in or sign up
    POST /api/auth/google      sign in with a Google account
    POST /api/auth/logout      sign out
    GET  /api/auth/me          who am I?

  A running theme: the answers this file gives are deliberately vague about
  whether an account exists. "Email or password is incorrect" is returned
  whether the email is unknown or the password is wrong. Saying "no account with
  that email" would let anyone check which of their friends have signed up.
*/

const router = express.Router();

// How strongly to hash passwords. Every extra round doubles the time taken,
// which slows an attacker down far more than it slows one honest sign in.
const HASH_ROUNDS = 12;


/*
  Turns a database row into the shape the frontend expects.
  It exists mainly so that password_hash can never be sent by accident:
  the only fields that leave this server are the ones written here.
*/
function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
  };
}


/* Signs a user in: makes a session and sets the cookie. */
function signIn(res, user) {
  const session = createSession(user.id);
  setSessionCookie(res, session.token, session.expires);
}


// ---------------------------------------------------------------
// POST /api/auth/signup
// ---------------------------------------------------------------
router.post('/signup', (req, res) => {
  const name = req.body.name;
  const email = req.body.email;
  const password = req.body.password;

  // Check everything before touching the database.
  const nameError = checkName(name);
  if (nameError) {
    return res.status(400).json({ error: nameError, field: 'name' });
  }

  const emailError = checkEmail(email);
  if (emailError) {
    return res.status(400).json({ error: emailError, field: 'email' });
  }

  const passwordError = checkPassword(password);
  if (passwordError) {
    return res.status(400).json({ error: passwordError, field: 'password' });
  }

  // Store emails lowercased, so Varun@Example.com and varun@example.com are
  // recognised as the same person rather than becoming two accounts.
  const cleanEmail = email.trim().toLowerCase();

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
  if (existing) {
    // Signup is the one place we have to admit the email is taken, because
    // there is no other way to explain the failure.
    return res.status(409).json({
      error: 'An account with that email already exists. Try signing in.',
      field: 'email',
    });
  }

  // NEVER store the password itself. bcrypt turns it into a hash that cannot be
  // reversed, and adds a random salt so two people with the same password get
  // different hashes.
  const passwordHash = bcrypt.hashSync(password, HASH_ROUNDS);

  const result = db.prepare(`
    INSERT INTO users (name, email, password_hash, created_at)
    VALUES (?, ?, ?, ?)
  `).run(name.trim(), cleanEmail, passwordHash, new Date().toISOString());

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);

  signIn(res, user);

  // 201 means "created", which is the right answer for a brand new account.
  return res.status(201).json({ user: publicUser(user) });
});


// ---------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------
router.post('/login', (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);

  // The same message for both failures, on purpose. See the note at the top.
  const wrong = { error: 'Email or password is incorrect.' };

  if (!user || !user.password_hash) {
    return res.status(401).json(wrong);
  }

  if (!bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json(wrong);
  }

  signIn(res, user);

  return res.json({ user: publicUser(user) });
});


// ---------------------------------------------------------------
// POST /api/auth/otp/send
// ---------------------------------------------------------------
router.post('/otp/send', (req, res) => {
  const phoneError = checkPhone(req.body.phone);
  if (phoneError) {
    return res.status(400).json({ error: phoneError, field: 'phone' });
  }

  const phone = keepOnlyDigits(req.body.phone);
  const result = sendCode(phone);

  if (!result.ok) {
    // 429 means "too many requests", the correct answer to rate limiting.
    return res.status(429).json({ error: result.error, field: 'phone' });
  }

  // Notice what comes back: nothing but "sent". The code stays on the server.
  return res.json({ sent: true });
});


// ---------------------------------------------------------------
// POST /api/auth/otp/verify
// ---------------------------------------------------------------
router.post('/otp/verify', (req, res) => {
  const phoneError = checkPhone(req.body.phone);
  if (phoneError) {
    return res.status(400).json({ error: phoneError, field: 'phone' });
  }

  const codeError = checkOtp(req.body.code);
  if (codeError) {
    return res.status(400).json({ error: codeError, field: 'code' });
  }

  const phone = keepOnlyDigits(req.body.phone);
  const code = keepOnlyDigits(req.body.code);

  const result = verifyCode(phone, code);

  if (!result.ok) {
    return res.status(401).json({ error: result.error, field: 'code' });
  }

  // The code was right. Either this number already has an account, or this is
  // the moment it gets one. Signing in and signing up are the same action for a
  // phone number, which is part of why people like it.
  let user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
  let isNew = false;

  if (!user) {
    const insert = db.prepare(`
      INSERT INTO users (name, phone, created_at) VALUES (?, ?, ?)
    `).run('', phone, new Date().toISOString());

    user = db.prepare('SELECT * FROM users WHERE id = ?').get(insert.lastInsertRowid);
    isNew = true;
  }

  signIn(res, user);

  return res.json({ user: publicUser(user), isNew });
});


// ---------------------------------------------------------------
// POST /api/auth/google
// ---------------------------------------------------------------
router.post('/google', async (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    return res.status(501).json({
      error: 'Google sign-in is not configured on the server yet. See SETUP.md.',
    });
  }

  const credential = req.body.credential;

  if (typeof credential !== 'string' || credential.length === 0) {
    return res.status(400).json({ error: 'No Google credential was sent.' });
  }

  /*
    This is the important part.

    The browser hands us a token it got from Google. We must NOT believe a word
    of it until Google itself confirms it. Anybody can send this endpoint a
    made-up token claiming to be anyone.

    Asking Google's tokeninfo endpoint is the simplest way to check. For a busy
    site you would instead verify the token's signature locally with the
    google-auth-library package, which avoids a network round trip on every
    sign in. For this app, simple and obviously correct wins.
  */
  let payload;

  try {
    const response = await fetch(
      'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential),
    );

    if (!response.ok) {
      return res.status(401).json({ error: 'Google could not verify that sign-in.' });
    }

    payload = await response.json();
  } catch {
    return res.status(502).json({ error: 'Could not reach Google. Please try again.' });
  }

  // "aud" is who the token was made FOR. If it is not us, someone is trying to
  // reuse a token issued to a different app. This check is not optional.
  if (payload.aud !== clientId) {
    return res.status(401).json({ error: 'That Google sign-in was not meant for this app.' });
  }

  // Google will not tell us an address is real unless it has been verified.
  if (payload.email_verified !== 'true' && payload.email_verified !== true) {
    return res.status(401).json({ error: 'That Google account has no verified email.' });
  }

  const googleId = payload.sub;
  const email = String(payload.email || '').toLowerCase();
  const name = String(payload.name || '');

  // Have we seen this Google account before?
  let user = db.prepare('SELECT * FROM users WHERE google_id = ?').get(googleId);

  if (!user && email) {
    // Not by Google id, but the email might already have a password account.
    // Linking them is friendlier than refusing, and safe here because Google
    // has confirmed the person owns that address.
    const byEmail = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (byEmail) {
      db.prepare('UPDATE users SET google_id = ? WHERE id = ?').run(googleId, byEmail.id);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(byEmail.id);
    }
  }

  let isNew = false;

  if (!user) {
    const insert = db.prepare(`
      INSERT INTO users (name, email, google_id, created_at) VALUES (?, ?, ?, ?)
    `).run(name, email || null, googleId, new Date().toISOString());

    user = db.prepare('SELECT * FROM users WHERE id = ?').get(insert.lastInsertRowid);
    isNew = true;
  }

  signIn(res, user);

  return res.json({ user: publicUser(user), isNew });
});


// ---------------------------------------------------------------
// POST /api/auth/logout
// ---------------------------------------------------------------
router.post('/logout', (req, res) => {
  const token = req.cookies[COOKIE_NAME];

  if (token) {
    deleteSession(token);
  }

  clearSessionCookie(res);

  return res.json({ ok: true });
});


// ---------------------------------------------------------------
// GET /api/auth/me
// ---------------------------------------------------------------
// The frontend calls this when a protected page loads, to find out whether
// there is anybody signed in before deciding what to show.
router.get('/me', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not signed in.' });
  }

  return res.json({ user: publicUser(req.user) });
});


export default router;
