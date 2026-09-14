import { config } from '../config.js';

/*
  The session cookie.

    httpOnly  page JavaScript cannot read it, so an injected script cannot steal it
    sameSite  other sites cannot make the browser send it
    secure    only sent over HTTPS, once NODE_ENV is production
*/

export const SESSION_COOKIE = 'nestworth_session';

export function setSessionCookie(res, session) {
  res.cookie(SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProduction,
    expires: session.expires,
    path: '/',
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

export function readSessionToken(req) {
  if (!req.cookies) {
    return '';
  }

  return req.cookies[SESSION_COOKIE] || '';
}
