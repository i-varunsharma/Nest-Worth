import crypto from 'node:crypto';
import db from '../db.js';

/*
  sessions.js
  -----------
  How the server remembers who is signed in.

  The idea, in one paragraph. When somebody signs in, we generate a long random
  string, save it in the sessions table next to their user id, and put that
  string in a cookie. The browser sends the cookie automatically on every later
  request, and the server looks it up to find out who is asking.

  Why a random string in a database rather than a JWT? Because it can be taken
  away. Deleting the row signs that person out instantly, everywhere. A JWT
  stays valid until it expires no matter what, so revoking one means keeping a
  list of banned tokens, which is the very database table you were avoiding.
  For an app this size, the simple option is also the better one.

  Three things make the cookie safe, and all three are set below:

    httpOnly   JavaScript on the page cannot read it. If someone manages to
               inject a script into the site, they still cannot steal the login.
    sameSite   The browser will not send it when another website makes a request
               to us, which is what stops cross-site request forgery.
    secure     Only sent over HTTPS. Switched on in production only, because
               local development runs on plain http.
*/

// The name that appears in the browser's cookie list.
export const COOKIE_NAME = 'nestworth_session';

// How long someone stays signed in without doing anything.
const SESSION_DAYS = 30;


/*
  Makes a new session and returns the token to put in the cookie.

  randomBytes(32) is 256 bits of true randomness from the operating system.
  Never use Math.random for anything security related: it is predictable, and
  predictable is the whole problem.
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


/*
  Looks up who a token belongs to.
  Returns the user, or null if the token is unknown or has expired.
*/
export function findUserByToken(token) {
  if (!token) {
    return null;
  }

  const session = db.prepare('SELECT * FROM sessions WHERE token = ?').get(token);

  if (!session) {
    return null;
  }

  // An expired session is as good as no session. Tidy it away while we are here.
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


/* Signs one session out. */
export function deleteSession(token) {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}


/*
  Puts the session token in a cookie on the response.
*/
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


/* Removes the cookie, so the browser stops sending it. */
export function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}


/*
  Express middleware. It runs before the route handlers and attaches the signed
  in user to the request, so every route below can just read req.user.

  It does NOT block anything. Routes that require a signed in user check for
  themselves with requireUser below.
*/
export function attachUser(req, res, next) {
  req.user = findUserByToken(req.cookies[COOKIE_NAME]);
  next();
}


/*
  Express middleware for routes that only make sense when signed in.
  401 means "I do not know who you are", which is exactly the situation.
*/
export function requireUser(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Please sign in first.' });
  }
  next();
}
