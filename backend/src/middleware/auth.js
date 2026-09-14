import { readSessionToken } from '../http/cookies.js';
import { noSession } from '../http/errors.js';
import { findUserByToken } from '../services/sessionService.js';

/*
  attachUser runs on every request and puts the signed-in user on req.user, or
  null. It blocks nothing.

  requireUser guards a route that needs somebody signed in.
*/

export function attachUser(req, res, next) {
  req.user = findUserByToken(readSessionToken(req));
  next();
}

export function requireUser(req, res, next) {
  if (!req.user) {
    return next(noSession());
  }

  return next();
}
