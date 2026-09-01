import crypto from 'node:crypto';
import db from '../database/db.js';

/*
  How the server remembers who is signed in.

  When somebody signs in we generate a long random string, save it in the
  sessions table next to their user id, and put it in a cookie. The browser
  sends the cookie on every later request and we look it up.

  Why not a JWT? Because a session in a table can be taken away. Deleting the
  row signs that person out instantly, everywhere. A JWT stays valid until it
  expires, so revoking one means keeping a list of banned tokens, which is the
  table you were trying to avoid.

  Three cookie settings do the security work, all set in setSessionCookie below:
  httpOnly keeps page JavaScript from reading it, sameSite stops other sites
  sending it, and secure keeps it off plain http once NODE_ENV is production.
*/

export const COOKIE_NAME = 'nestworth_session';

const SESSION_DAYS = 30;

/*
  Makes a session and returns the token for the cookie.

  randomBytes is 256 bits from the operating system. Never use Math.random for
  anything security related: it is predictable, which is the whole problem.
*/
export function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');

  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  db.prepare(`
    INSERT INTO sessions (token, user_id, created_at, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(token, userId, now.toISOString(), expires.toISOString());

  return { token, expires };
}

/* Returns the user a token belongs to, or null if it is unknown or expired. */
export function findUserByToken(token) {
  if (!token) {
    return null;
  }

  const session = db.prepare('SELECT * FROM sessions WHERE token = ?').get(token);

  if (!session) {
    return null;
  }

  if (new Date(session.expires_at) < new Date()) {
    deleteSession(token);
    return null;
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(session.user_id);

  if (!user) {
    return null;
  }

  return user;
}

export function deleteSession(token) {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

export function setSessionCookie(res, token, expires) {
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    expires: expires,
    path: '/',
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

/*
  Middleware. Runs before the routes and puts the signed-in user on req.user,
  or null. It blocks nothing.
*/
export function attachUser(req, res, next) {
  req.user = findUserByToken(req.cookies[COOKIE_NAME]);
  next();
}

/*
  Middleware for routes that only make sense when signed in.

  The "code" is for the browser rather than the person. A 401 from this API can
  mean two completely different things: a wrong password, or a session that has
  ended. Both are 401, and the browser has to react differently, so this one
  says which it is. Without it the frontend would have to guess from the URL.
*/
export function requireUser(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Please sign in first.',
      code: 'no_session',
    });
  }
  next();
}
