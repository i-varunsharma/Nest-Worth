import crypto from 'node:crypto';
import { sessionRepository } from '../repositories/sessionRepository.js';
import { userRepository } from '../repositories/userRepository.js';

/*
  Who is signed in.

  Signing in creates a long random token, stores it next to the user id, and the
  browser keeps it in a cookie (see http/cookies.js). Each request looks the
  token up.

  A stored session rather than a JWT, because deleting the row signs that
  browser out immediately. That is what lets a password change sign out every
  other device.
*/

const SESSION_DAYS = 30;
const TOKEN_BYTES = 32;
const DAY_MS = 24 * 60 * 60 * 1000;


/*
  Returns { token, expires }.

  crypto.randomBytes comes from the operating system and cannot be predicted.
  Math.random must never be used for a secret.
*/
export function createSession(userId) {
  const token = crypto.randomBytes(TOKEN_BYTES).toString('hex');
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DAYS * DAY_MS);

  sessionRepository.create(token, userId, now, expires);

  return { token: token, expires: expires };
}


/* The user a token belongs to, or null if the token is unknown or expired. */
export function findUserByToken(token) {
  if (!token) {
    return null;
  }

  const session = sessionRepository.find(token);

  if (session === null) {
    return null;
  }

  if (session.expiresAt < new Date()) {
    sessionRepository.remove(token);
    return null;
  }

  return userRepository.findById(session.userId);
}


export function endSession(token) {
  sessionRepository.remove(token);
}


/* Signs a user out of every browser. */
export function endAllSessions(userId) {
  sessionRepository.removeAllForUser(userId);
}
