import db from '../database/db.js';

// What actually happened each month. One row per user per month.

function checkinFromRow(row) {
  return {
    id: row.id,
    month: row.month,
    income: row.income,
    spent: row.spent,
    saved: row.saved,
    invested: row.invested,
    note: row.note,
  };
}

// Months are stored as 'YYYY-MM', so sorting the text sorts by date.
const listRecentStatement = db.prepare(
  'SELECT * FROM checkins WHERE user_id = ? ORDER BY month DESC LIMIT ?',
);

const findByMonthStatement = db.prepare(
  'SELECT * FROM checkins WHERE user_id = ? AND month = ?',
);

// Saving a month that already exists updates it, through UNIQUE (user_id, month).
const saveStatement = db.prepare(`
  INSERT INTO checkins (user_id, month, income, spent, saved, invested, note, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(user_id, month) DO UPDATE SET
    income   = excluded.income,
    spent    = excluded.spent,
    saved    = excluded.saved,
    invested = excluded.invested,
    note     = excluded.note
`);

export const checkinRepository = {
  listRecent(userId, limit) {
    return listRecentStatement.all(userId, limit).map(checkinFromRow);
  },

  save(userId, checkin) {
    saveStatement.run(
      userId,
      checkin.month,
      checkin.income,
      checkin.spent,
      checkin.saved,
      checkin.invested,
      checkin.note,
      new Date().toISOString(),
    );

    return checkinFromRow(findByMonthStatement.get(userId, checkin.month));
  },
};
