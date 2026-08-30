import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import db from '../db.js';

/*
  otp.js
  ------
  Making, sending and checking the six digit code.

  Four rules are built into this file, and every one of them exists because
  leaving it out has burned somebody:

    1. The code is generated HERE, on the server, and never sent back in the
       response. If the browser could see the code, the whole thing would be
       theatre.

    2. Only the HASH of the code is stored. If the database file leaked, the
       codes in it would still be useless.

    3. Codes expire, and wrong guesses are counted. Six digits is only a million
       combinations, which a script gets through in minutes. Five attempts and
       the code is destroyed.

    4. Sending is rate limited. Without this, somebody can loop the endpoint
       overnight and every message costs you real money. This is the single most
       common way a hobby project ends up with an unpleasant bill.
*/

// A code is good for ten minutes.
const CODE_LIFETIME_MINUTES = 10;

// Wrong guesses allowed before the code is thrown away.
const MAX_ATTEMPTS = 5;

// The gap before a new code can be requested for the same number.
const RESEND_WAIT_SECONDS = 30;

// How strongly to hash. bcrypt deliberately takes time, which is what makes
// guessing slow. 10 is a sensible middle for a short lived code.
const HASH_ROUNDS = 10;


/*
  Makes a random six digit code as text, keeping any leading zeros.

  randomInt comes from the crypto module, so the numbers are genuinely
  unpredictable. Math.random is not, and an attacker who can predict your codes
  does not need to guess them.
*/
function makeCode() {
  const number = crypto.randomInt(0, 1000000);
  return String(number).padStart(6, '0');
}


/*
  Creates a code for a phone number and "sends" it.

  Returns { ok: true } when a code went out, or { ok: false, error, waitSeconds }
  when the caller is asking too soon.
*/
export function sendCode(phone) {
  const now = new Date();

  const existing = db.prepare('SELECT * FROM otp_codes WHERE phone = ?').get(phone);

  // Rule 4: refuse to send again too quickly.
  if (existing) {
    const secondsSinceLastSend = (now - new Date(existing.sent_at)) / 1000;

    if (secondsSinceLastSend < RESEND_WAIT_SECONDS) {
      const waitSeconds = Math.ceil(RESEND_WAIT_SECONDS - secondsSinceLastSend);
      return {
        ok: false,
        error: `Please wait ${waitSeconds} seconds before asking for another code.`,
        waitSeconds,
      };
    }
  }

  const code = makeCode();
  const codeHash = bcrypt.hashSync(code, HASH_ROUNDS);
  const expiresAt = new Date(now.getTime() + CODE_LIFETIME_MINUTES * 60 * 1000);

  // One live code per number. Asking again replaces the old one, which also
  // resets the attempt counter.
  db.prepare(`
    INSERT INTO otp_codes (phone, code_hash, expires_at, sent_at, attempts)
    VALUES (?, ?, ?, ?, 0)
    ON CONFLICT(phone) DO UPDATE SET
      code_hash  = excluded.code_hash,
      expires_at = excluded.expires_at,
      sent_at    = excluded.sent_at,
      attempts   = 0
  `).run(phone, codeHash, expiresAt.toISOString(), now.toISOString());

  deliver(phone, code);

  return { ok: true };
}


/*
  Where the text message would actually be sent.

  There is no SMS provider connected yet, so for now the code is printed in the
  terminal running this server. That is enough to use the whole sign-in flow
  while building.

  Note what this function does NOT do: it does not return the code to whoever
  called it. Printing to the server's own terminal is private. Putting the code
  in an HTTP response would hand it to anyone who asked.

  To send real messages, replace the body of this function with a call to your
  provider. SETUP.md explains which providers work in India and what has to be
  registered first.
*/
function deliver(phone, code) {
  console.log('');
  console.log('  ┌─────────────────────────────────────────┐');
  console.log(`  │  Verification code for +91 ${phone}   │`);
  console.log(`  │                                         │`);
  console.log(`  │            >>>  ${code}  <<<            │`);
  console.log('  └─────────────────────────────────────────┘');
  console.log('  (No SMS provider connected. See SETUP.md.)');
  console.log('');
}


/*
  Checks a typed code against the stored hash.
  Returns { ok: true } or { ok: false, error }.
*/
export function verifyCode(phone, code) {
  const record = db.prepare('SELECT * FROM otp_codes WHERE phone = ?').get(phone);

  if (!record) {
    return { ok: false, error: 'Ask for a code first.' };
  }

  // Rule 3, part one: has it expired?
  if (new Date(record.expires_at) < new Date()) {
    db.prepare('DELETE FROM otp_codes WHERE phone = ?').run(phone);
    return { ok: false, error: 'That code has expired. Ask for a new one.' };
  }

  // Rule 3, part two: too many wrong guesses.
  if (record.attempts >= MAX_ATTEMPTS) {
    db.prepare('DELETE FROM otp_codes WHERE phone = ?').run(phone);
    return { ok: false, error: 'Too many wrong tries. Ask for a new code.' };
  }

  const isCorrect = bcrypt.compareSync(code, record.code_hash);

  if (!isCorrect) {
    db.prepare('UPDATE otp_codes SET attempts = attempts + 1 WHERE phone = ?').run(phone);

    const triesLeft = MAX_ATTEMPTS - (record.attempts + 1);

    if (triesLeft <= 0) {
      db.prepare('DELETE FROM otp_codes WHERE phone = ?').run(phone);
      return { ok: false, error: 'Too many wrong tries. Ask for a new code.' };
    }

    return { ok: false, error: `That code is not right. ${triesLeft} tries left.` };
  }

  // Correct. Destroy it so the same code can never be used twice.
  db.prepare('DELETE FROM otp_codes WHERE phone = ?').run(phone);

  return { ok: true };
}
