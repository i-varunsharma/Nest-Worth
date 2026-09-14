import db from '../database/db.js';

/*
  Lines read from bank statements.

  Months are matched with LIKE '2026-08%'. Callers must pass a month that has
  already been checked against MONTH_PATTERN in validation/records.js, because
  it goes into the pattern.
*/

function transactionFromRow(row) {
  return {
    id: row.id,
    occurredOn: row.occurred_on,
    description: row.description,
    amount: row.amount,
    direction: row.direction,
    category: row.category,
    isConfirmed: row.is_confirmed === 1,
  };
}

// INSERT OR IGNORE against UNIQUE (user_id, fingerprint): importing the same
// statement twice adds nothing the second time.
const insertStatement = db.prepare(`
  INSERT OR IGNORE INTO transactions
    (user_id, occurred_on, description, amount, direction, category, fingerprint, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const monthsStatement = db.prepare(`
  SELECT substr(occurred_on, 1, 7) AS month, COUNT(*) AS lines
  FROM transactions
  WHERE user_id = ?
  GROUP BY month
  ORDER BY month DESC
`);

const yearsStatement = db.prepare(`
  SELECT substr(occurred_on, 1, 4) AS year, COUNT(*) AS lines
  FROM transactions
  WHERE user_id = ?
  GROUP BY year
  ORDER BY year DESC
`);

const totalsByCategoryStatement = db.prepare(`
  SELECT category, direction, COUNT(*) AS lines, SUM(amount) AS total
  FROM transactions
  WHERE user_id = ? AND occurred_on LIKE ?
  GROUP BY category, direction
  ORDER BY total DESC
`);

const countStatement = db.prepare(`
  SELECT COUNT(*) AS total FROM transactions WHERE user_id = ? AND occurred_on LIKE ?
`);

// Lines still sitting in "other" that nobody has looked at.
const countUnreviewedStatement = db.prepare(`
  SELECT COUNT(*) AS total
  FROM transactions
  WHERE user_id = ? AND occurred_on LIKE ? AND is_confirmed = 0 AND category = 'other'
`);

const listForMonthStatement = db.prepare(`
  SELECT * FROM transactions
  WHERE user_id = ? AND occurred_on LIKE ?
  ORDER BY occurred_on DESC, id DESC
`);

// is_confirmed = 1 marks a person's answer, which a re-run of the rules must not overwrite.
const setCategoryStatement = db.prepare(`
  UPDATE transactions SET category = ?, is_confirmed = 1 WHERE id = ? AND user_id = ?
`);

const findStatement = db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?');

const deleteMonthStatement = db.prepare(
  'DELETE FROM transactions WHERE user_id = ? AND occurred_on LIKE ?',
);

export const transactionRepository = {
  /*
    Saves parsed statement rows in one transaction, so a failure part way
    through leaves nothing half imported. Returns how many were new.
  */
  importRows: db.transaction((userId, rows) => {
    const now = new Date().toISOString();
    let added = 0;

    for (const row of rows) {
      const result = insertStatement.run(
        userId,
        row.occurredOn,
        row.description,
        row.amount,
        row.direction,
        row.category,
        row.fingerprint,
        now,
      );

      // 0 changes means the fingerprint was already there.
      if (result.changes === 1) {
        added = added + 1;
      }
    }

    return added;
  }),

  listMonths(userId) {
    return monthsStatement.all(userId);
  },

  listYears(userId) {
    return yearsStatement.all(userId);
  },

  totalsByCategory(userId, month) {
    return totalsByCategoryStatement.all(userId, month + '%');
  },

  countLines(userId, month) {
    return countStatement.get(userId, month + '%').total;
  },

  countUnreviewed(userId, month) {
    return countUnreviewedStatement.get(userId, month + '%').total;
  },

  listForMonth(userId, month) {
    return listForMonthStatement.all(userId, month + '%').map(transactionFromRow);
  },

  /* Returns the updated transaction, or null if it is not this user's. */
  setCategory(userId, id, category) {
    const result = setCategoryStatement.run(category, id, userId);

    if (result.changes === 0) {
      return null;
    }

    return transactionFromRow(findStatement.get(id, userId));
  },

  /* Returns how many lines were removed. */
  removeMonth(userId, month) {
    return deleteMonthStatement.run(userId, month + '%').changes;
  },
};
