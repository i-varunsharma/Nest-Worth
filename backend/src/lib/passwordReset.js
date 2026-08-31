import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import db from '../database/db.js';

/*
  The "I forgot my password" link.

  Built the same way as otp.js, because it is the same problem: give somebody a
  secret, let them prove they received it, and make sure it cannot be reused,
  guessed, or read out of a stolen database.

  The rules, and why:

    The token is made here and only travels to the person's inbox. It is never
    returned to the browser, because a secret the browser can read proves
    nothing about who is holding it.

    Only a hash of it is stored, so a leaked database is a list of useless
    strings rather than working keys to everyone's account.

    It expires in an hour. Reset links get forwarded, logged by mail servers and
    left in inboxes for years.

    Using it signs every other browser out. That happens in routes/auth.js.

  An hour rather than the OTP's ten minutes because an email has to arrive, be
  noticed and be opened.
*/

const LINK_LIFETIME_MINUTES = 60;

// Stops the endpoint being used to flood somebody's inbox.
const RESEND_WAIT_SECONDS = 60;

const HASH_ROUNDS = 10;

/*
  Builds the token that goes in the link, as "userId.secret".

  The id is there because we store only a hash, and a hash cannot be searched
  for. Without it we would have to fetch every reset row and bcrypt-compare each
  one. Knowing a user id gives an attacker nothing; the secret is still 256 bits
  of randomness.
*/
function makeToken(userId) {
  const secret = crypto.randomBytes(32).toString('hex');
  return userId + '.' + secret;
}

/* Splits a token back into its two parts, or returns null if it is malformed. */
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

  return { userId, secret };
}

/*
  Creates a reset link and sends it.
  Returns { ok: true }, or { ok: false, error } if asked again too soon.
*/
export function sendResetLink(user) {
  const now = new Date();

  const existing = db.prepare('SELECT * FROM password_resets WHERE user_id = ?').get(user.id);

  if (existing) {
    const secondsSinceLastSend = (now - new Date(existing.sent_at)) / 1000;

    if (secondsSinceLastSend < RESEND_WAIT_SECONDS) {
      const waitSeconds = Math.ceil(RESEND_WAIT_SECONDS - secondsSinceLastSend);
      return {
        ok: false,
        error: `Please wait ${waitSeconds} seconds before asking for another link.`,
      };
    }
  }

  const token = makeToken(user.id);
  const parts = splitToken(token);
  const tokenHash = bcrypt.hashSync(parts.secret, HASH_ROUNDS);
  const expiresAt = new Date(now.getTime() + LINK_LIFETIME_MINUTES * 60 * 1000);

  // One live reset per account. Asking again replaces the previous row, which
  // stops the older link working. If somebody asks three times because the
  // first email was slow, only the newest should open the door.
  db.prepare(`
    INSERT INTO password_resets (user_id, token_hash, expires_at, sent_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      token_hash = excluded.token_hash,
      expires_at = excluded.expires_at,
      sent_at    = excluded.sent_at
  `).run(user.id, tokenHash, expiresAt.toISOString(), now.toISOString());

  deliver(user, token);

  return { ok: true };
}

/*
  Where the email would be sent. There is no provider connected yet, so the
  link is printed in the terminal running this server, the same stand-in the
  OTP uses.

  To send real email, replace the body of this function with a call to your
  provider. Nothing else in this file changes. See SETUP.md.
*/
function deliver(user, token) {
  const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
  const link = clientOrigin + '/reset-password?token=' + encodeURIComponent(token);

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
  Checks a token from a reset link.
  Returns { ok: true, user } or { ok: false, error }.

  Every failure gives the same message, so the endpoint cannot be used to work
  out which tokens exist.
*/
export function useResetToken(token) {
  const wrong = {
    ok: false,
    error: 'That reset link is not valid any more. Please ask for a new one.',
  };

  const parts = splitToken(token);

  if (!parts) {
    return wrong;
  }

  const record = db.prepare('SELECT * FROM password_resets WHERE user_id = ?').get(parts.userId);

  if (!record) {
    return wrong;
  }

  if (new Date(record.expires_at) < new Date()) {
    db.prepare('DELETE FROM password_resets WHERE user_id = ?').run(parts.userId);
    return wrong;
  }

  if (!bcrypt.compareSync(parts.secret, record.token_hash)) {
    return wrong;
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(parts.userId);

  if (!user) {
    return wrong;
  }

  return { ok: true, user };
}

/*
  Throws a used reset away so the link cannot work twice.

  Separate from useResetToken, and called only after the new password is saved,
  so a failure while saving does not burn the person's only link.
*/
export function clearResetToken(userId) {
  db.prepare('DELETE FROM password_resets WHERE user_id = ?').run(userId);
}

/* Signs a user out of every browser. Used right after a password changes. */
export function deleteAllSessionsForUser(userId) {
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}
