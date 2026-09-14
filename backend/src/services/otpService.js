import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { otpCodeRepository } from '../repositories/otpCodeRepository.js';
import { tooManyRequests, unauthorized } from '../http/errors.js';

/*
  The six digit code for phone sign-in.

  The code is never sent back in a response, only a hash of it is stored, it
  expires, and wrong guesses are counted. Six digits is a million combinations,
  which a script could try in minutes without the attempt limit.
*/

const CODE_LIFETIME_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RESEND_WAIT_SECONDS = 30;
const HASH_ROUNDS = 10;
const CODE_DIGITS = 6;
const MINUTE_MS = 60 * 1000;


/* A random six digit code as text, keeping leading zeros. */
function makeCode() {
  const number = crypto.randomInt(0, 10 ** CODE_DIGITS);
  return String(number).padStart(CODE_DIGITS, '0');
}


/*
  Where the text message would be sent. No SMS provider is connected, so the
  code is printed in the API terminal. Replace this body to send real messages;
  see SETUP.md.
*/
function deliver(phone, code) {
  console.log('');
  console.log('  ┌─────────────────────────────────────────┐');
  console.log('  │  Verification code for +91 ' + phone + '   │');
  console.log('  │                                         │');
  console.log('  │            >>>  ' + code + '  <<<            │');
  console.log('  └─────────────────────────────────────────┘');
  console.log('  (No SMS provider connected. See SETUP.md.)');
  console.log('');
}


/* Creates a code for a phone number and sends it. Throws a 429 if asked again too soon. */
export function sendCode(phone) {
  const now = new Date();
  const existing = otpCodeRepository.find(phone);

  if (existing !== null) {
    const secondsSinceSent = (now - existing.sentAt) / 1000;

    if (secondsSinceSent < RESEND_WAIT_SECONDS) {
      const waitSeconds = Math.ceil(RESEND_WAIT_SECONDS - secondsSinceSent);

      throw tooManyRequests(
        'Please wait ' + waitSeconds + ' seconds before asking for another code.',
        waitSeconds,
        'phone',
      );
    }
  }

  const code = makeCode();
  const codeHash = bcrypt.hashSync(code, HASH_ROUNDS);
  const expiresAt = new Date(now.getTime() + CODE_LIFETIME_MINUTES * MINUTE_MS);

  otpCodeRepository.save(phone, codeHash, expiresAt, now);
  deliver(phone, code);
}


/* Checks a typed code. Throws a 401 with the reason when it is not accepted. */
export function verifyCode(phone, code) {
  const record = otpCodeRepository.find(phone);

  if (record === null) {
    throw unauthorized('Ask for a code first.', 'code');
  }

  if (record.expiresAt < new Date()) {
    otpCodeRepository.remove(phone);
    throw unauthorized('That code has expired. Ask for a new one.', 'code');
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    otpCodeRepository.remove(phone);
    throw unauthorized('Too many wrong tries. Ask for a new code.', 'code');
  }

  if (bcrypt.compareSync(code, record.codeHash) === false) {
    const triesLeft = MAX_ATTEMPTS - (record.attempts + 1);

    if (triesLeft <= 0) {
      otpCodeRepository.remove(phone);
      throw unauthorized('Too many wrong tries. Ask for a new code.', 'code');
    }

    otpCodeRepository.countWrongAttempt(phone);
    throw unauthorized('That code is not right. ' + triesLeft + ' tries left.', 'code');
  }

  // Used once, then gone.
  otpCodeRepository.remove(phone);
}
