import express from 'express';
import db from '../database/db.js';
import { requireUser } from '../lib/sessions.js';
import { rateLimit } from '../lib/rateLimit.js';
import { parseStatement } from '../lib/statement.js';
import { isKnownCategory, isSpending } from '../../../shared/categories.js';

/*
    POST   /api/transactions/import        read a statement CSV
    GET    /api/transactions/months        which months have anything in them
    GET    /api/transactions/summary       one month, added up by category
    GET    /api/transactions               one month, line by line
    PATCH  /api/transactions/:id           correct one category
    DELETE /api/transactions/month/:month  throw a whole month away

  Every query filters on user_id from the session cookie, like the rest of the
  API. Nothing here trusts an id from the browser on its own.
*/

const router = express.Router();

/*
  A statement is a few hundred lines and the parsing is real work, so this is
  limited more tightly than the list routes. It is generous enough that somebody
  importing a year one month at a time never notices.
*/
const importLimit = rateLimit({
  limit: 20,
  windowMs: 60 * 60 * 1000,
  message: 'That is a lot of statements in one hour. Try again a little later.',
});

// 'YYYY-MM' and nothing else. Everything that takes a month goes through this,
// because the month is put straight into a LIKE pattern below.
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;


/* Turns a database row into the shape the browser uses. */
function publicTransaction(row) {
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


/*
  Reads the month out of the query string, defaulting to the current one.
  Returns an empty string if what arrived is not a month at all.
*/
function readMonth(value) {
  if (value === undefined || value === null || value === '') {
    return new Date().toISOString().slice(0, 7);
  }

  if (MONTH_PATTERN.test(String(value)) === false) {
    return '';
  }

  return String(value);
}


// ---------------------------------------------------------------
// POST /api/transactions/import
// ---------------------------------------------------------------
router.post('/import', requireUser, importLimit, (req, res) => {
  const csv = req.body.csv;

  if (typeof csv !== 'string' || csv.trim().length === 0) {
    return res.status(400).json({ error: 'Send the contents of the CSV file.' });
  }

  const parsed = parseStatement(csv);

  if (parsed.error) {
    return res.status(400).json({ error: parsed.error });
  }

  const now = new Date().toISOString();

  /*
    INSERT OR IGNORE, against the UNIQUE (user_id, fingerprint) index.

    This is what makes importing the same file twice harmless. The alternative,
    checking for each row first and then inserting it, is both slower and wrong:
    between the check and the insert the row can arrive from somewhere else.
    Letting the database enforce the rule means there is no gap to lose.
  */
  const insert = db.prepare(`
    INSERT OR IGNORE INTO transactions
      (user_id, occurred_on, description, amount, direction, category, fingerprint, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  /*
    All of it or none of it.

    A statement half imported is worse than one not imported at all, because the
    totals look plausible and are wrong. db.transaction wraps the whole loop, so
    a failure part way through leaves the table exactly as it was.
  */
  const importAll = db.transaction((rows) => {
    let added = 0;

    for (const row of rows) {
      const result = insert.run(
        req.user.id,
        row.occurredOn,
        row.description,
        row.amount,
        row.direction,
        row.category,
        row.fingerprint,
        now,
      );

      // changes is 0 when the UNIQUE index refused the row, meaning this exact
      // transaction was already here.
      if (result.changes === 1) {
        added = added + 1;
      }
    }

    return added;
  });

  const added = importAll(parsed.rows);

  // Which months this file touched, so the page can jump to one of them.
  const months = [];

  for (const row of parsed.rows) {
    const month = row.occurredOn.slice(0, 7);

    if (months.includes(month) === false) {
      months.push(month);
    }
  }

  months.sort();

  return res.status(201).json({
    added: added,
    alreadyHad: parsed.rows.length - added,
    unreadableLines: parsed.skipped,
    months: months,
  });
});


// ---------------------------------------------------------------
// GET /api/transactions/months
// ---------------------------------------------------------------
router.get('/months', requireUser, (req, res) => {
  /*
    substr(occurred_on, 1, 7) turns '2026-08-14' into '2026-08'. Grouping on
    that is how the months are found without a month column: the date is stored
    in a format where the first seven characters ARE the month, which is the
    whole reason for storing it that way.
  */
  const rows = db.prepare(`
    SELECT substr(occurred_on, 1, 7) AS month, COUNT(*) AS lines
    FROM transactions
    WHERE user_id = ?
    GROUP BY month
    ORDER BY month DESC
  `).all(req.user.id);

  return res.json({ months: rows });
});


// ---------------------------------------------------------------
// GET /api/transactions/summary?month=YYYY-MM
// ---------------------------------------------------------------
router.get('/summary', requireUser, (req, res) => {
  const month = readMonth(req.query.month);

  if (month === '') {
    return res.status(400).json({ error: 'A month looks like 2026-08.' });
  }

  const like = month + '%';

  /*
    Added up in SQL rather than in JavaScript.

    The browser has no use for four hundred individual rows when the question is
    "how much on food". Sending them all so the page can add them up means
    moving every column of every row across the network to throw nearly all of
    it away. This is the same reasoning as lib/insights.js.
  */
  const byCategory = db.prepare(`
    SELECT
      category,
      direction,
      COUNT(*)   AS lines,
      SUM(amount) AS total
    FROM transactions
    WHERE user_id = ? AND occurred_on LIKE ?
    GROUP BY category, direction
    ORDER BY total DESC
  `).all(req.user.id, like);

  /*
    The three headline numbers.

    Note what "spent" is NOT: it is not everything that left the account. A SIP
    and a transfer to your own savings both leave, and neither is money spent.
    Counting them would tell somebody their spending is out of control on the
    exact month they saved the most, which is the opposite of useful. So the
    spending total is built from the spending categories only, and the rest is
    reported separately.
  */
  let income = 0;
  let spent = 0;
  let putAway = 0;

  const categories = [];

  for (const row of byCategory) {
    if (row.direction === 'credit' && row.category === 'income') {
      income = income + row.total;
    }

    if (row.direction === 'debit') {
      if (isSpending(row.category) === true) {
        spent = spent + row.total;
        categories.push({ key: row.category, total: row.total, lines: row.lines });
      }

      if (row.category === 'investment') {
        putAway = putAway + row.total;
      }
    }
  }

  // The share each category is of the spending, worked out once here so no
  // screen has to divide and risk dividing by zero.
  let spendingForShare = spent;

  if (spendingForShare <= 0) {
    spendingForShare = 1;
  }

  categories.forEach((entry) => {
    entry.share = (entry.total / spendingForShare) * 100;
  });

  const lineCount = db.prepare(`
    SELECT COUNT(*) AS total FROM transactions WHERE user_id = ? AND occurred_on LIKE ?
  `).get(req.user.id, like);

  // How much of the month is still a guess, so the page can say so rather than
  // presenting an unreviewed breakdown as fact.
  const unconfirmed = db.prepare(`
    SELECT COUNT(*) AS total
    FROM transactions
    WHERE user_id = ? AND occurred_on LIKE ? AND is_confirmed = 0 AND category = 'other'
  `).get(req.user.id, like);

  return res.json({
    summary: {
      month: month,
      income: income,
      spent: spent,
      putAway: putAway,
      kept: income - spent,
      lines: lineCount.total,
      needingAttention: unconfirmed.total,
      categories: categories,
    },
  });
});


// ---------------------------------------------------------------
// GET /api/transactions?month=YYYY-MM
// ---------------------------------------------------------------
router.get('/', requireUser, (req, res) => {
  const month = readMonth(req.query.month);

  if (month === '') {
    return res.status(400).json({ error: 'A month looks like 2026-08.' });
  }

  const rows = db.prepare(`
    SELECT * FROM transactions
    WHERE user_id = ? AND occurred_on LIKE ?
    ORDER BY occurred_on DESC, id DESC
  `).all(req.user.id, month + '%');

  return res.json({ transactions: rows.map(publicTransaction) });
});


// ---------------------------------------------------------------
// PATCH /api/transactions/:id
// ---------------------------------------------------------------
router.patch('/:id', requireUser, (req, res) => {
  const category = req.body.category;

  if (isKnownCategory(category) === false) {
    return res.status(400).json({ error: 'That is not a category.' });
  }

  // is_confirmed goes to 1 because a person said so. It is what keeps this
  // answer safe from any later re-run of the guessing rules.
  const result = db.prepare(`
    UPDATE transactions
    SET category = ?, is_confirmed = 1
    WHERE id = ? AND user_id = ?
  `).run(category, req.params.id, req.user.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'No such transaction.' });
  }

  const row = db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);

  return res.json({ transaction: publicTransaction(row) });
});


// ---------------------------------------------------------------
// DELETE /api/transactions/month/:month
// ---------------------------------------------------------------
router.delete('/month/:month', requireUser, (req, res) => {
  const month = req.params.month;

  if (MONTH_PATTERN.test(month) === false) {
    return res.status(400).json({ error: 'A month looks like 2026-08.' });
  }

  /*
    A whole month at a time, not one row at a time.

    Importing the wrong file is the obvious mistake somebody will make, and
    without this the only way back is deleting three hundred rows by hand. An
    action that cannot be undone is one people are afraid to try.
  */
  const result = db.prepare(`
    DELETE FROM transactions WHERE user_id = ? AND occurred_on LIKE ?
  `).run(req.user.id, month + '%');

  return res.json({ removed: result.changes });
});


export default router;
