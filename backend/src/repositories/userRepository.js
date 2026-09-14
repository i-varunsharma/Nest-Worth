import db from '../database/db.js';

/*
  Accounts.

  The objects returned here include passwordHash, because the auth service needs
  it. They must never be sent to the browser as they are: services/authService.js
  has publicUser() for that.
*/

function userFromRow(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    googleId: row.google_id,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
  };
}

function oneOrNull(row) {
  if (!row) {
    return null;
  }
  return userFromRow(row);
}

const byId = db.prepare('SELECT * FROM users WHERE id = ?');
const byEmail = db.prepare('SELECT * FROM users WHERE email = ?');
const byPhone = db.prepare('SELECT * FROM users WHERE phone = ?');
const byGoogleId = db.prepare('SELECT * FROM users WHERE google_id = ?');

const insertStatement = db.prepare(`
  INSERT INTO users (name, email, phone, password_hash, google_id, created_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const setPasswordStatement = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?');
const setGoogleIdStatement = db.prepare('UPDATE users SET google_id = ? WHERE id = ?');
const setNameStatement = db.prepare('UPDATE users SET name = ? WHERE id = ?');

// ON DELETE CASCADE in schema.sql removes every row that belongs to the user.
const deleteStatement = db.prepare('DELETE FROM users WHERE id = ?');

export const userRepository = {
  findById(id) {
    return oneOrNull(byId.get(id));
  },

  findByEmail(email) {
    return oneOrNull(byEmail.get(email));
  },

  findByPhone(phone) {
    return oneOrNull(byPhone.get(phone));
  },

  findByGoogleId(googleId) {
    return oneOrNull(byGoogleId.get(googleId));
  },

  /* fields: { name, email, phone, passwordHash, googleId }. Missing ones are stored as NULL. */
  create(fields) {
    const result = insertStatement.run(
      fields.name || '',
      fields.email || null,
      fields.phone || null,
      fields.passwordHash || null,
      fields.googleId || null,
      new Date().toISOString(),
    );

    return this.findById(result.lastInsertRowid);
  },

  setPasswordHash(id, passwordHash) {
    setPasswordStatement.run(passwordHash, id);
  },

  setGoogleId(id, googleId) {
    setGoogleIdStatement.run(googleId, id);
  },

  setName(id, name) {
    setNameStatement.run(name, id);
  },

  remove(id) {
    deleteStatement.run(id);
  },
};
