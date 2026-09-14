import db from '../database/db.js';
import { merchantName } from '../services/statementParser.js';

// A year, added up, for the recap page. Each figure is one SQL pass over the
// year's transactions rather than thousands of rows sent to JavaScript.

// The calendar year, January to December, which is what people mean by "this
// year". The April to March financial year is for tax, not for looking back.
function yearRange(year) {
  return {
    like: String(year) + '%',
    start: String(year) + '-01',
    end: String(year) + '-12',
  };
}


/* The months that have anything at all in them, so the page can say how much
   of the year it is actually talking about. */
export function monthsCovered(userId, year) {
  const range = yearRange(year);

  const row = db.prepare(`
    SELECT COUNT(DISTINCT substr(occurred_on, 1, 7)) AS months
    FROM transactions
    WHERE user_id = ? AND occurred_on LIKE ?
  `).get(userId, range.like);

  const checkins = db.prepare(`
    SELECT COUNT(*) AS months
    FROM checkins
    WHERE user_id = ? AND month BETWEEN ? AND ?
  `).get(userId, range.start, range.end);

  return {
    fromStatements: row.months,
    fromCheckins: checkins.months,
  };
}


/*
  The year's totals in one query. SUM(CASE WHEN ... THEN amount ELSE 0 END) adds
  only matching rows, so several totals come from one pass. The category lists must
  match shared/categories.js: investing is money moved, not spent.
*/
export function yearTotals(userId, year) {
  const range = yearRange(year);

  const row = db.prepare(`
    SELECT
      SUM(CASE WHEN direction = 'credit' AND category = 'income'
               THEN amount ELSE 0 END) AS cameIn,

      SUM(CASE WHEN direction = 'debit'
                AND category NOT IN ('investment', 'transfer', 'income')
               THEN amount ELSE 0 END) AS spent,

      SUM(CASE WHEN direction = 'debit' AND category = 'investment'
               THEN amount ELSE 0 END) AS putAway,

      COUNT(*) AS lines
    FROM transactions
    WHERE user_id = ? AND occurred_on LIKE ?
  `).get(userId, range.like);

  // SUM over no rows is NULL, not 0. Left alone, every figure on the recap
  // would read "₹—" for somebody with nothing imported.
  return {
    cameIn: row.cameIn || 0,
    spent: row.spent || 0,
    putAway: row.putAway || 0,
    lines: row.lines || 0,
  };
}


/* Where the year's money went, biggest first. */
export function yearCategories(userId, year) {
  const range = yearRange(year);

  return db.prepare(`
    SELECT category, SUM(amount) AS total, COUNT(*) AS lines
    FROM transactions
    WHERE user_id = ?
      AND occurred_on LIKE ?
      AND direction = 'debit'
      AND category NOT IN ('investment', 'transfer', 'income')
    GROUP BY category
    ORDER BY total DESC
  `).all(userId, range.like);
}


// The heaviest and lightest spending months. The WITH clause names the monthly
// totals once and ORDER BY ... LIMIT 1 takes each end.
export function heaviestAndLightestMonth(userId, year) {
  const range = yearRange(year);

  const rows = db.prepare(`
    WITH monthly AS (
      SELECT substr(occurred_on, 1, 7) AS month, SUM(amount) AS total
      FROM transactions
      WHERE user_id = ?
        AND occurred_on LIKE ?
        AND direction = 'debit'
        AND category NOT IN ('investment', 'transfer', 'income')
      GROUP BY month
    )
    SELECT * FROM (SELECT month, total, 'heaviest' AS which FROM monthly ORDER BY total DESC LIMIT 1)
    UNION ALL
    SELECT * FROM (SELECT month, total, 'lightest' AS which FROM monthly ORDER BY total ASC LIMIT 1)
  `).all(userId, range.like);

  let heaviest = null;
  let lightest = null;

  for (const row of rows) {
    if (row.which === 'heaviest') {
      heaviest = { month: row.month, total: row.total };
    }

    if (row.which === 'lightest') {
      lightest = { month: row.month, total: row.total };
    }
  }

  // With one month of data both ends are that month. The caller drops the second.
  return { heaviest: heaviest, lightest: lightest };
}


/*
  The thing paid for most often, by count rather than amount: the largest amount
  is always rent, but forty small orders is news. Rent and loan repayments are left
  out because they are monthly by definition.
*/
export function mostFrequentPayment(userId, year) {
  const range = yearRange(year);

  const rows = db.prepare(`
    SELECT description, amount
    FROM transactions
    WHERE user_id = ?
      AND occurred_on LIKE ?
      AND direction = 'debit'
      AND category NOT IN ('investment', 'transfer', 'income', 'rent', 'emi')
  `).all(userId, range.like);

  // Grouped in JavaScript, because the key is a cleaned-up merchant name that SQL
  // cannot produce.
  const counts = new Map();

  for (const row of rows) {
    const name = merchantName(row.description);

    let entry = counts.get(name);

    if (entry === undefined) {
      entry = { name: name, times: 0, total: 0 };
      counts.set(name, entry);
    }

    entry.times = entry.times + 1;
    entry.total = entry.total + row.amount;
  }

  let best = null;

  for (const entry of counts.values()) {
    if (best === null) {
      best = entry;
      continue;
    }

    if (entry.times > best.times) {
      best = entry;
      continue;
    }

    // Ties go to the larger total, so the answer does not change when an unrelated
    // row is added.
    if (entry.times === best.times && entry.total > best.total) {
      best = entry;
    }
  }

  // Once is not a habit. Below this it is not worth a line on the page.
  if (best === null || best.times < 3) {
    return null;
  }

  return best;
}


/* Everything the recap page needs, in one object. */
export function buildRecap(userId, year) {
  const totals = yearTotals(userId, year);
  const ends = heaviestAndLightestMonth(userId, year);

  let lightest = ends.lightest;

  // Only one month of data: the heaviest and lightest are the same month.
  if (ends.heaviest && lightest && ends.heaviest.month === lightest.month) {
    lightest = null;
  }

  return {
    year: year,
    covered: monthsCovered(userId, year),
    totals: totals,
    kept: totals.cameIn - totals.spent,
    categories: yearCategories(userId, year),
    heaviestMonth: ends.heaviest,
    lightestMonth: lightest,
    mostFrequent: mostFrequentPayment(userId, year),
  };
}
