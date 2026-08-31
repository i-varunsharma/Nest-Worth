import express from 'express';
import bcrypt from 'bcryptjs';
import db from '../database/db.js';
import { sendCode, verifyCode } from '../lib/otp.js';
import {
  COOKIE_NAME,
  clearSessionCookie,
  createSession,
  deleteSession,
  requireUser,
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
import { rateLimit } from '../lib/rateLimit.js';
import {
  clearResetToken,
  deleteAllSessionsForUser,
  sendResetLink,
  useResetToken,
} from '../lib/passwordReset.js';

/*
  Everything to do with getting in and out of an account.

    POST /api/auth/signup      make an account with an email and password
    POST /api/auth/login       sign in with that email and password
    POST /api/auth/otp/send    text a six digit code to a mobile number
    POST /api/auth/otp/verify  check the code, and sign in or sign up
    POST /api/auth/google      sign in with a Google account
    POST /api/auth/forgot      email a password reset link
    POST /api/auth/reset       set a new password using that link
    POST /api/auth/password    change the password while signed in
    DELETE /api/auth/account   delete the account and everything in it
    POST /api/auth/logout      sign out
    GET  /api/auth/me          who am I?

  The answers here are deliberately vague about whether an account exists.
  "Email or password is incorrect" comes back whether the email is unknown or
  the password is wrong, because "no account with that email" would let anyone
  check which of their friends have signed up.
*/

const router = express.Router();

// How strongly to hash passwords. Every extra round doubles the time taken,
// which slows an attacker down far more than it slows one honest sign in.
const HASH_ROUNDS = 12;


/*
  The rate limits.

  Every route below that takes a guess, or causes a message to be sent, is
  capped. The numbers are meant to be invisible to a real person and useless to
  a script: somebody who has forgotten which password they used might try five
  or six times, but nobody types twelve in a minute.
*/

// Signing in, the one most worth attacking.
const loginLimit = rateLimit({
  limit: 10,
  windowMs: 15 * 60 * 1000,
  message: 'Too many sign-in attempts. Please wait fifteen minutes and try again.',
});

// Making accounts, so one script cannot fill the database with them.
const signupLimit = rateLimit({
  limit: 5,
  windowMs: 60 * 60 * 1000,
  message: 'Too many accounts created from here. Please try again later.',
});

/*
  Anything that sends a message: the phone code and the reset email.

  otp.js already refuses to send twice within thirty seconds to the same number.
  This limit is on the caller instead, which is the gap that leaves. Without it
  a script can walk through ten thousand different numbers, and every one costs
  you a message.
*/
const sendMessageLimit = rateLimit({
  limit: 5,
  windowMs: 15 * 60 * 1000,
  message: 'Too many requests. Please wait fifteen minutes and try again.',
});

// Checking a code or a reset link. Guessing again, so the same treatment.
const verifyLimit = rateLimit({
  limit: 10,
  windowMs: 15 * 60 * 1000,
  message: 'Too many attempts. Please wait fifteen minutes and try again.',
});


/*
  Turns a database row into the shape the frontend expects.

  It exists so password_hash cannot be sent by accident. The only fields that
  leave this server are the ones listed here.
*/
function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,

    // Whether a password has ever been chosen. Somebody who only ever signed in
    // with Google or a phone code has none, so the settings page offers to set
    // one rather than asking for a current password they never had.
    //
    // This is a true or false, never the hash itself.
    hasPassword: Boolean(user.password_hash),
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
router.post('/signup', signupLimit, (req, res) => {
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

  // Lowercased, so Varun@Example.com and varun@example.com are one account.
  const cleanEmail = email.trim().toLowerCase();

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
  if (existing) {
    // The one place we have to admit an email is taken. There is no other way
    // to explain the failure.
    return res.status(409).json({
      error: 'An account with that email already exists. Try signing in.',
      field: 'email',
    });
  }

  // Never store the password itself. bcrypt turns it into a hash that cannot be
  // reversed, and salts it so two people with the same password get different
  // hashes.
  const passwordHash = bcrypt.hashSync(password, HASH_ROUNDS);

  const result = db.prepare(`
    INSERT INTO users (name, email, password_hash, created_at)
    VALUES (?, ?, ?, ?)
  `).run(name.trim(), cleanEmail, passwordHash, new Date().toISOString());

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);

  signIn(res, user);

  // 201 means "created".
  return res.status(201).json({ user: publicUser(user) });
});


// ---------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------
router.post('/login', loginLimit, (req, res) => {
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
router.post('/otp/send', sendMessageLimit, (req, res) => {
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

  // Nothing comes back but "sent". The code stays on the server.
  return res.json({ sent: true });
});


// ---------------------------------------------------------------
// POST /api/auth/otp/verify
// ---------------------------------------------------------------
router.post('/otp/verify', verifyLimit, (req, res) => {
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

  // The code was right. Either this number has an account or this is the moment
  // it gets one. Signing in and signing up are the same action for a phone
  // number.
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
    The browser hands us a token it got from Google, and we cannot believe any
    of it until Google confirms it. Anybody can post this endpoint a made-up
    token claiming to be anyone.

    Asking Google's tokeninfo endpoint is the simplest check. A busier site
    would verify the signature locally with google-auth-library instead, which
    saves a network round trip on every sign in.
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

  // "aud" is who the token was made for. If it is not us, somebody is reusing a
  // token issued to a different app. This check is not optional.
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
// POST /api/auth/forgot
// ---------------------------------------------------------------
// Step one of "I forgot my password": ask for a reset link.
router.post('/forgot', sendMessageLimit, (req, res) => {
  const emailError = checkEmail(req.body.email);

  if (emailError) {
    return res.status(400).json({ error: emailError, field: 'email' });
  }

  const cleanEmail = req.body.email.trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);

  /*
    This answers the same way whether or not the email has an account. It never
    says "no account with that address".

    If it did, the endpoint would be a tool for checking which addresses are
    registered: feed it ten thousand emails, keep the ones that answer
    differently, and you have a list of users to send phishing mail to. Reset
    forms are the classic place this leaks.

    The cost is that somebody who mistypes their address waits for an email that
    never arrives. Every large site makes the same trade.
  */
  if (user) {
    sendResetLink(user);
  }

  return res.json({
    sent: true,
    message: 'If there is an account with that email, a reset link is on its way.',
  });
});


// ---------------------------------------------------------------
// POST /api/auth/reset
// ---------------------------------------------------------------
// Step two: hand back the token from the link, along with the new password.
router.post('/reset', verifyLimit, (req, res) => {
  const passwordError = checkPassword(req.body.password);

  if (passwordError) {
    return res.status(400).json({ error: passwordError, field: 'password' });
  }

  const result = useResetToken(req.body.token);

  if (!result.ok) {
    return res.status(400).json({ error: result.error, field: 'token' });
  }

  const passwordHash = bcrypt.hashSync(req.body.password, HASH_ROUNDS);

  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, result.user.id);

  /*
    Three things happen once the password has changed.

    Throw the reset token away, so the link cannot be used again by whoever else
    reads that email.

    Delete every session on the account. Somebody resetting may be doing it
    because a stranger got in, and leaving the stranger signed in would make the
    reset pointless. This is the step easiest to forget.

    Then sign them in fresh, so they land on the dashboard rather than a login
    form, having just proved who they are.
  */
  clearResetToken(result.user.id);
  deleteAllSessionsForUser(result.user.id);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.user.id);

  signIn(res, user);

  return res.json({ user: publicUser(user) });
});


// ---------------------------------------------------------------
// POST /api/auth/password
// ---------------------------------------------------------------
// Changing the password from the settings page, while signed in.
router.post('/password', requireUser, verifyLimit, (req, res) => {
  const newPasswordError = checkPassword(req.body.newPassword);

  if (newPasswordError) {
    return res.status(400).json({ error: newPasswordError, field: 'newPassword' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

  /*
    Somebody who has a password has to type the current one first.

    Being signed in is not enough on its own. If a laptop is left unlocked, the
    person who sits down at it should not be able to lock the owner out of their
    own account in two clicks. Asking for the current password is what makes
    that a real barrier rather than a formality.

    An account that has never had a password, because it only ever signed in
    with Google or a phone code, has nothing to check, so it skips this and sets
    one for the first time.
  */
  if (user.password_hash) {
    if (typeof req.body.currentPassword !== 'string' || req.body.currentPassword.length === 0) {
      return res.status(400).json({
        error: 'Enter your current password.',
        field: 'currentPassword',
      });
    }

    if (!bcrypt.compareSync(req.body.currentPassword, user.password_hash)) {
      return res.status(401).json({
        error: 'That is not your current password.',
        field: 'currentPassword',
      });
    }

    if (req.body.currentPassword === req.body.newPassword) {
      return res.status(400).json({
        error: 'That is the password you already have. Pick a different one.',
        field: 'newPassword',
      });
    }
  }

  const passwordHash = bcrypt.hashSync(req.body.newPassword, HASH_ROUNDS);

  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, user.id);

  /*
    Same as a reset: every other browser is signed out, and then this one is
    signed back in with a new session.

    Doing it in that order matters. Deleting everything first and then making a
    fresh session means the person changing the password stays where they are,
    while anybody else holding an old cookie is out.
  */
  deleteAllSessionsForUser(user.id);
  clearResetToken(user.id);

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);

  signIn(res, updated);

  return res.json({ user: publicUser(updated) });
});


// ---------------------------------------------------------------
// DELETE /api/auth/account
// ---------------------------------------------------------------
// Closing the account for good.
router.delete('/account', requireUser, verifyLimit, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

  /*
    An account with a password has to type it again.

    Deleting is the one action here that cannot be undone, so being signed in is
    not enough on its own. Somebody who walks up to an unlocked laptop should
    not be able to destroy the owner's records in two clicks.

    An account that has only ever used Google or a phone code has no password to
    ask for. The interface makes those people type the word DELETE instead,
    which is checked below, so there is still a deliberate step.
  */
  if (user.password_hash) {
    if (typeof req.body.password !== 'string' || req.body.password.length === 0) {
      return res.status(400).json({ error: 'Enter your password to confirm.', field: 'password' });
    }

    if (!bcrypt.compareSync(req.body.password, user.password_hash)) {
      return res.status(401).json({ error: 'That password is not right.', field: 'password' });
    }
  } else if (req.body.confirmText !== 'DELETE') {
    return res.status(400).json({
      error: 'Type DELETE to confirm.',
      field: 'confirmText',
    });
  }

  /*
    One statement removes everything.

    Every other table has "ON DELETE CASCADE" against users(id) in schema.sql,
    so removing this row takes the sessions, household, debts, goals, assets and
    check-ins with it. That is the whole reason those lines are in the schema:
    the alternative is six DELETE statements in the right order, and forgetting
    one leaves somebody's finances in the database after they asked you to
    remove them.

    The foreign_keys pragma in db.js is what makes SQLite honour it. Without
    that line this would delete the user and orphan everything else.
  */
  db.prepare('DELETE FROM users WHERE id = ?').run(user.id);

  clearSessionCookie(res);

  return res.json({ ok: true });
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
// Called when a protected page loads, to find out who is signed in before
// deciding what to show.
router.get('/me', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not signed in.' });
  }

  return res.json({ user: publicUser(req.user) });
});


export default router;
