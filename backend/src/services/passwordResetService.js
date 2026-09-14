import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import { passwordResetRepository } from '../repositories/passwordResetRepository.js';
import { userRepository } from '../repositories/userRepository.js';
import { badRequest } from '../http/errors.js';

/*
  The "forgot password" link. Built like the phone code: the token only travels
  to the person's inbox, only a hash is stored, and it expires.

  An hour rather than ten minutes, because an email has to arrive and be opened.
*/

const LINK_LIFETIME_MINUTES = 60;
const RESEND_WAIT_SECONDS = 60;
const HASH_ROUNDS = 10;
const TOKEN_BYTES = 32;
const MINUTE_MS = 60 * 1000;

const INVALID_LINK = 'That reset link is not valid any more. Please ask for a new one.';


/*
  The token is "userId.secret". The id is there because only a hash is stored,
  and a hash cannot be looked up. The id alone gives an attacker nothing.
*/
function makeToken(userId) {
  return userId + '.' + crypto.randomBytes(TOKEN_BYTES).toString('hex');
}

/* Returns { userId, secret }, or null for a malformed token. */
function splitToken(token) {
  if (typeof token !== 'string') {
    return null;
  }

  const dot = token.indexOf('.');

  if (dot === -1) {
    return null;
  }

  const userId = Number(token.slice(0, dot));
  const secret = token.slice(dot + 1);

  if (!Number.isInteger(userId) || userId <= 0 || secret.length === 0) {
    return null;
  }

  return { userId: userId, secret: secret };
}


/*
  Where the email would be sent. No provider is connected, so the link is
  printed in the API terminal. Replace this body to send real email; see SETUP.md.
*/
function deliver(user, token) {
  const link = config.clientOrigin + '/reset-password?token=' + encodeURIComponent(token);

  console.log('');
  console.log('  ┌──────────────────────────────────────────────────────────┐');
  console.log('  │  Password reset link                                     │');
  console.log('  └──────────────────────────────────────────────────────────┘');
  console.log('  for: ' + (user.email || '(no email)'));
  console.log('');
  console.log('  ' + link);
  console.log('');
  console.log('  Works once, for ' + LINK_LIFETIME_MINUTES + ' minutes.');
  console.log('  (No email provider connected. See SETUP.md.)');
  console.log('');
}


/*
  Creates and sends a reset link. Asked again too soon, it quietly does nothing,
  so the forgot form still answers the same way.
*/
export function sendResetLink(user) {
  const now = new Date();
  const existing = passwordResetRepository.find(user.id);

  if (existing !== null && (now - existing.sentAt) / 1000 < RESEND_WAIT_SECONDS) {
    return;
  }

  const token = makeToken(user.id);
  const tokenHash = bcrypt.hashSync(splitToken(token).secret, HASH_ROUNDS);
  const expiresAt = new Date(now.getTime() + LINK_LIFETIME_MINUTES * MINUTE_MS);

  passwordResetRepository.save(user.id, tokenHash, expiresAt, now);
  deliver(user, token);
}


/*
  Returns the user a reset token belongs to. Every failure throws the same
  message, so the endpoint cannot be used to find out which tokens exist.
*/
export function userForResetToken(token) {
  const parts = splitToken(token);

  if (parts === null) {
    throw badRequest(INVALID_LINK, 'token');
  }

  const record = passwordResetRepository.find(parts.userId);

  if (record === null) {
    throw badRequest(INVALID_LINK, 'token');
  }

  if (record.expiresAt < new Date()) {
    passwordResetRepository.remove(parts.userId);
    throw badRequest(INVALID_LINK, 'token');
  }

  if (bcrypt.compareSync(parts.secret, record.tokenHash) === false) {
    throw badRequest(INVALID_LINK, 'token');
  }

  const user = userRepository.findById(parts.userId);

  if (user === null) {
    throw badRequest(INVALID_LINK, 'token');
  }

  return user;
}


/* Called after the new password is saved, so a failed save does not burn the link. */
export function clearResetLink(userId) {
  passwordResetRepository.remove(userId);
}
