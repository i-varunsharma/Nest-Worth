import { rateLimit } from './rateLimit.js';
import { HOUR_MS, MINUTE_MS } from '../utils/time.js';

/*
  Every rate limit in the API, in one place, so "how often can somebody do X?"
  has one answer. How the counting works is in rateLimit.js.

  A real person never reaches these numbers; a script reaches them in seconds.

    Limit             Used by                                   Allows
    loginLimit        /auth/login, /auth/google                 10 per 15 minutes
    signupLimit       /auth/signup                              5 per hour
    sendMessageLimit  /auth/otp/send, /auth/forgot              5 per 15 minutes
    verifyLimit       /auth/otp/verify, /reset, /password,      10 per 15 minutes
                      DELETE /auth/account
    importLimit       /transactions/import                      20 per hour
    askLimit          /advice (costs money per request)         20 per hour
    briefingLimit     /briefing                                 60 per hour
*/

const FIFTEEN_MINUTES = 15 * MINUTE_MS;

export const loginLimit = rateLimit({
  limit: 10,
  windowMs: FIFTEEN_MINUTES,
  message: 'Too many sign-in attempts. Please wait fifteen minutes and try again.',
});

export const signupLimit = rateLimit({
  limit: 5,
  windowMs: HOUR_MS,
  message: 'Too many accounts created from here. Please try again later.',
});

// Sending a text or an email, which a real provider would charge for.
export const sendMessageLimit = rateLimit({
  limit: 5,
  windowMs: FIFTEEN_MINUTES,
  message: 'Too many requests. Please wait fifteen minutes and try again.',
});

// Anything that checks a guess: a code, a reset link or the current password.
export const verifyLimit = rateLimit({
  limit: 10,
  windowMs: FIFTEEN_MINUTES,
  message: 'Too many attempts. Please wait fifteen minutes and try again.',
});

// Parsing a statement is real work, so it is capped more tightly than reads.
export const importLimit = rateLimit({
  limit: 20,
  windowMs: HOUR_MS,
  message: 'That is a lot of statements in one hour. Try again a little later.',
});

// The only route that costs money on every request.
export const askLimit = rateLimit({
  limit: 20,
  windowMs: HOUR_MS,
  message: 'That is a lot of questions in one hour. Try again a little later.',
});

// The note is stored once a day, but a new account or a new day reaches the
// model, so the route still needs a ceiling of its own.
export const briefingLimit = rateLimit({
  limit: 60,
  windowMs: HOUR_MS,
});
