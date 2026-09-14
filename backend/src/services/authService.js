import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import { inTransaction } from '../database/db.js';
import { userRepository } from '../repositories/userRepository.js';
import { createSession, endAllSessions } from './sessionService.js';
import { clearResetLink, sendResetLink, userForResetToken } from './passwordResetService.js';
import { verifyCode } from './otpService.js';
import {
  badRequest,
  conflict,
  notConfigured,
  unauthorized,
  upstreamFailed,
} from '../http/errors.js';

/*
  Signing up, signing in, and managing a password.

  Each function that signs somebody in returns { user, session }. The route sets
  the cookie from the session, because a cookie is HTTP and this file is not.

  Messages are deliberately vague about whether an account exists: a login with
  an unknown email gets the same answer as a wrong password, so the form cannot
  be used to find out who has an account.
*/

// Each extra round doubles the time to hash, which slows an attacker far more
// than it slows one honest sign-in.
const PASSWORD_HASH_ROUNDS = 12;

const GOOGLE_TOKEN_INFO_URL = 'https://oauth2.googleapis.com/tokeninfo?id_token=';


/* The fields that may leave the server. Never the password hash. */
export function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,

    // Whether a password was ever chosen, so settings can offer to set one.
    hasPassword: Boolean(user.passwordHash),
  };
}


function normaliseEmail(email) {
  return email.trim().toLowerCase();
}

function hashPassword(password) {
  return bcrypt.hashSync(password, PASSWORD_HASH_ROUNDS);
}


/*
  Creates the account and its first session together. Without the transaction a
  failure between the two would leave an account holding the email that nobody
  can sign in to.
*/
const createAccountWithSession = inTransaction((fields) => {
  const user = userRepository.create(fields);
  const session = createSession(user.id);

  return { user: user, session: session };
});


/* Replaces the password and signs out every other browser, all or nothing. */
const replacePassword = inTransaction((userId, passwordHash) => {
  userRepository.setPasswordHash(userId, passwordHash);
  clearResetLink(userId);
  endAllSessions(userId);

  return createSession(userId);
});


export function signUp(name, email, password) {
  const cleanEmail = normaliseEmail(email);

  if (userRepository.findByEmail(cleanEmail) !== null) {
    throw conflict('An account with that email already exists. Try signing in.', 'email');
  }

  return createAccountWithSession({
    name: name.trim(),
    email: cleanEmail,
    passwordHash: hashPassword(password),
  });
}


export function logIn(email, password) {
  if (typeof email !== 'string' || typeof password !== 'string') {
    throw badRequest('Email and password are required.');
  }

  const user = userRepository.findByEmail(normaliseEmail(email));
  const wrong = unauthorized('Email or password is incorrect.');

  if (user === null || !user.passwordHash) {
    throw wrong;
  }

  if (bcrypt.compareSync(password, user.passwordHash) === false) {
    throw wrong;
  }

  return { user: user, session: createSession(user.id) };
}


/* For a phone number, signing in and signing up are the same action. Returns { user, session, isNew }. */
export function logInWithPhone(phone, code) {
  verifyCode(phone, code);

  let user = userRepository.findByPhone(phone);
  let isNew = false;

  if (user === null) {
    user = userRepository.create({ phone: phone });
    isNew = true;
  }

  return { user: user, session: createSession(user.id), isNew: isNew };
}


/*
  Asks Google whether a sign-in token is genuine. Anybody can post a made-up
  token, so nothing in it is believed until Google confirms it.
*/
async function verifyGoogleToken(credential) {
  let response;

  try {
    response = await fetch(GOOGLE_TOKEN_INFO_URL + encodeURIComponent(credential));
  } catch {
    throw upstreamFailed('Could not reach Google. Please try again.');
  }

  if (!response.ok) {
    throw unauthorized('Google could not verify that sign-in.');
  }

  return response.json();
}


/* Returns { user, session, isNew }. */
export async function logInWithGoogle(credential) {
  const clientId = config.googleClientId;

  if (!clientId) {
    throw notConfigured('Google sign-in is not configured on the server yet. See SETUP.md.');
  }

  if (typeof credential !== 'string' || credential.length === 0) {
    throw badRequest('No Google credential was sent.');
  }

  const payload = await verifyGoogleToken(credential);

  // "aud" is the app the token was issued for. Anything else is a token from
  // another app being reused here.
  if (payload.aud !== clientId) {
    throw unauthorized('That Google sign-in was not meant for this app.');
  }

  if (payload.email_verified !== 'true' && payload.email_verified !== true) {
    throw unauthorized('That Google account has no verified email.');
  }

  const googleId = payload.sub;
  const email = String(payload.email || '').toLowerCase();

  let user = userRepository.findByGoogleId(googleId);
  let isNew = false;

  // An existing email account is linked. Safe, because Google has verified
  // that this person owns the address.
  if (user === null && email) {
    const byEmail = userRepository.findByEmail(email);

    if (byEmail !== null) {
      userRepository.setGoogleId(byEmail.id, googleId);
      user = userRepository.findById(byEmail.id);
    }
  }

  if (user === null) {
    user = userRepository.create({ name: String(payload.name || ''), email: email, googleId: googleId });
    isNew = true;
  }

  return { user: user, session: createSession(user.id), isNew: isNew };
}


/* Sends a link if the email has an account, and says nothing either way. */
export function requestPasswordReset(email) {
  const user = userRepository.findByEmail(normaliseEmail(email));

  if (user !== null) {
    sendResetLink(user);
  }
}


/* Returns { user, session }. */
export function resetPassword(token, newPassword) {
  const user = userForResetToken(token);
  const session = replacePassword(user.id, hashPassword(newPassword));

  return { user: userRepository.findById(user.id), session: session };
}


/*
  Changes the password while signed in. An account that has a password must
  give it first, so an unlocked laptop is not enough to take the account. One
  that never had a password (Google or phone only) is setting its first.

  Returns { user, session }. This browser stays signed in; every other one is signed out.
*/
export function changePassword(userId, currentPassword, newPassword) {
  const user = userRepository.findById(userId);

  if (user.passwordHash) {
    if (typeof currentPassword !== 'string' || currentPassword.length === 0) {
      throw badRequest('Enter your current password.', 'currentPassword');
    }

    if (bcrypt.compareSync(currentPassword, user.passwordHash) === false) {
      throw unauthorized('That is not your current password.', 'currentPassword');
    }

    if (currentPassword === newPassword) {
      throw badRequest('That is the password you already have. Pick a different one.', 'newPassword');
    }
  }

  const session = replacePassword(user.id, hashPassword(newPassword));

  return { user: userRepository.findById(user.id), session: session };
}


/*
  Deletes the account and, through ON DELETE CASCADE, everything in it.
  Accounts with a password must type it; others must type DELETE.
*/
export function deleteAccount(userId, password, confirmText) {
  const user = userRepository.findById(userId);

  if (user.passwordHash) {
    if (typeof password !== 'string' || password.length === 0) {
      throw badRequest('Enter your password to confirm.', 'password');
    }

    if (bcrypt.compareSync(password, user.passwordHash) === false) {
      throw unauthorized('That password is not right.', 'password');
    }
  } else if (confirmText !== 'DELETE') {
    throw badRequest('Type DELETE to confirm.', 'confirmText');
  }

  userRepository.remove(user.id);
}
