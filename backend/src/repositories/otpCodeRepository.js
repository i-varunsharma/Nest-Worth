import db from '../database/db.js';

// Live one-time codes for phone sign-in, one per phone number. See services/otpService.js.

const findStatement = db.prepare('SELECT * FROM otp_codes WHERE phone = ?');

// Asking again replaces the old code and resets the attempt counter.
const saveStatement = db.prepare(`
  INSERT INTO otp_codes (phone, code_hash, expires_at, sent_at, attempts)
  VALUES (?, ?, ?, ?, 0)
  ON CONFLICT(phone) DO UPDATE SET
    code_hash  = excluded.code_hash,
    expires_at = excluded.expires_at,
    sent_at    = excluded.sent_at,
    attempts   = 0
`);

const countAttemptStatement = db.prepare('UPDATE otp_codes SET attempts = attempts + 1 WHERE phone = ?');
const deleteStatement = db.prepare('DELETE FROM otp_codes WHERE phone = ?');

export const otpCodeRepository = {
  /* Returns { codeHash, expiresAt, sentAt, attempts } or null. */
  find(phone) {
    const row = findStatement.get(phone);

    if (!row) {
      return null;
    }

    return {
      codeHash: row.code_hash,
      expiresAt: new Date(row.expires_at),
      sentAt: new Date(row.sent_at),
      attempts: row.attempts,
    };
  },

  save(phone, codeHash, expiresAt, sentAt) {
    saveStatement.run(phone, codeHash, expiresAt.toISOString(), sentAt.toISOString());
  },

  countWrongAttempt(phone) {
    countAttemptStatement.run(phone);
  },

  remove(phone) {
    deleteStatement.run(phone);
  },
};
