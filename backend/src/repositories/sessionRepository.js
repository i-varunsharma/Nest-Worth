import db from '../database/db.js';

// Signed-in browsers. See services/sessionService.js.

const insertStatement = db.prepare(
  'INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
);
const findStatement = db.prepare('SELECT * FROM sessions WHERE token = ?');
const deleteStatement = db.prepare('DELETE FROM sessions WHERE token = ?');
const deleteForUserStatement = db.prepare('DELETE FROM sessions WHERE user_id = ?');

export const sessionRepository = {
  create(token, userId, createdAt, expiresAt) {
    insertStatement.run(token, userId, createdAt.toISOString(), expiresAt.toISOString());
  },

  /* Returns { token, userId, expiresAt } or null. */
  find(token) {
    const row = findStatement.get(token);

    if (!row) {
      return null;
    }

    return { token: row.token, userId: row.user_id, expiresAt: new Date(row.expires_at) };
  },

  remove(token) {
    deleteStatement.run(token);
  },

  removeAllForUser(userId) {
    deleteForUserStatement.run(userId);
  },
};
