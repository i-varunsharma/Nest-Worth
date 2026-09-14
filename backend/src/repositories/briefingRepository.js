import db from '../database/db.js';

// The daily note on the dashboard. One row per user per day.

function briefingFromRow(row) {
  return {
    body: row.body,
    signals: JSON.parse(row.signals),
    writtenBy: row.written_by,
    madeOn: row.made_on,
  };
}

const findStatement = db.prepare('SELECT * FROM briefings WHERE user_id = ? AND made_on = ?');

// OR IGNORE: two tabs opening the dashboard at once both try to write today's
// note, and UNIQUE (user_id, made_on) keeps the first.
const insertStatement = db.prepare(`
  INSERT OR IGNORE INTO briefings (user_id, made_on, body, signals, written_by, created_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);

export const briefingRepository = {
  /* Returns the note for that day, or null. */
  findForDay(userId, day) {
    const row = findStatement.get(userId, day);

    if (!row) {
      return null;
    }

    return briefingFromRow(row);
  },

  /* Saves the note unless one already exists, then returns whichever is stored. */
  saveOnce(userId, day, note) {
    insertStatement.run(
      userId,
      day,
      note.body,
      JSON.stringify(note.signals),
      note.writtenBy,
      new Date().toISOString(),
    );

    return this.findForDay(userId, day);
  },
};
