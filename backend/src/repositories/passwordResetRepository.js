import db from '../database/db.js';

// Live password reset links, one per account. See services/passwordResetService.js.

const findStatement = db.prepare('SELECT * FROM password_resets WHERE user_id = ?');

// Asking again replaces the previous row, so only the newest link works.
const saveStatement = db.prepare(`
  INSERT INTO password_resets (user_id, token_hash, expires_at, sent_at)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(user_id) DO UPDATE SET
    token_hash = excluded.token_hash,
    expires_at = excluded.expires_at,
    sent_at    = excluded.sent_at
`);

const deleteStatement = db.prepare('DELETE FROM password_resets WHERE user_id = ?');

export const passwordResetRepository = {
  /* Returns { tokenHash, expiresAt, sentAt } or null. */
  find(userId) {
    const row = findStatement.get(userId);

    if (!row) {
      return null;
    }

    return {
      tokenHash: row.token_hash,
      expiresAt: new Date(row.expires_at),
      sentAt: new Date(row.sent_at),
    };
  },

  save(userId, tokenHash, expiresAt, sentAt) {
    saveStatement.run(userId, tokenHash, expiresAt.toISOString(), sentAt.toISOString());
  },

  remove(userId) {
    deleteStatement.run(userId);
  },
};
