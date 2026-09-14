import db from '../database/db.js';
import { merchantName } from '../services/statementParser.js';

/*
  A year, added up.

  Every other screen in this app is about the next decision. This one is about
  what already happened, and it exists for a different reason: a plan is easy to
  abandon in month three, and the thing that makes somebody carry on is seeing
  that the last eleven months were not nothing.

  All of it is one pass per question in SQL. The recap covers a whole year, so
  fetching the rows to add them up in JavaScript would mean sending a few
  thousand transactions across the network to produce eight numbers.
*/

/*
  What a year is here.

  The calendar year, not the Indian financial year, which runs April to March.
  Somebody looking back over "this year" in December means January to December,
  and a recap that quietly starts in April would be wrong in a way that is very
  hard to notice. The financial year is the right unit for tax and the wrong one
  for a story about your own money.
*/
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
  The totals for the year, out of the imported statements.

  Written as one query with three conditional sums rather than three queries.
  SUM(CASE WHEN ... THEN amount ELSE 0 END) adds up only the rows that match,
  which is how several different totals come out of one pass over the table.
  Three separate queries would read the same rows three times.

  The category list is what decides which is which, and it has to match
  shared/categories.js. Investing is money moved, not money spent.
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


/*
  The month the most was spent in, and the month the least was.

  A WITH clause names the per-month totals once and then uses that name twice,
  which is how both ends come out of one query instead of two nearly identical
  ones. ORDER BY ... LIMIT 1 in each direction picks the ends off it.
*/
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

  /*
    One month of data makes both ends the same month, which is true and reads
    as nonsense on a page. The caller drops the second one.
  */
  return { heaviest: heaviest, lightest: lightest };
}


/*
  The thing paid for most often.

  Counted by how many times, not by how much, because those answer different
  questions. The largest amount is rent every single year and surprises nobody;
  forty small orders is a number most people have never seen written down.

  Rent and loan repayments are left out for that same reason. They are one fixed
  payment a month by definition, so "you paid rent twelve times" is arithmetic
  about the calendar rather than anything about the person. Everything else
  stays in, including subscriptions, because a subscription somebody has
  forgotten they have is exactly the sort of thing worth putting on this page.
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

  // Grouped in JavaScript rather than in SQL, because the grouping key is not a
  // column: it is a cleaned-up piece of the description, and SQLite has no
  // function that would tidy a bank narration.
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

    /*
      A tie broken by the larger total, rather than by whichever happened to be
      read first. Ties are common here: several monthly subscriptions all come
      to twelve. Leaving it to the order the rows arrived in means the answer
      changes when an unrelated row is added, which is the kind of thing that
      makes somebody stop believing the page.
    */
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

  // Both ends are the same month when there is only one month. Saying "the
  // heaviest month was August and the lightest was also August" is true and
  // reads as a mistake.
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
