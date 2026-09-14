import db from '../database/db.js';

/*
  The reporting queries.

  Everywhere else in this project the server fetches rows and JavaScript adds
  them up. That is fine when you need every row anyway, which is what the debts
  page and the goals page do. It stops being fine here, because none of these
  answers need the rows at all: they need a total, a share, or a running sum.

  Fetching two years of check-ins to work out an average means sending every
  column of every row across a connection so that JavaScript can throw almost
  all of it away. The database can do that work where the data already is, in
  one pass, using an index. That is what it is for.

  Every query below is written out in full rather than built by joining strings
  together. Building SQL from strings is how injection happens, and it also
  makes a query impossible to copy into a shell and run when it misbehaves.
  Every value that varies is a ? parameter.
*/


// Two years of history. Enough to see a trend, small enough to stay quick.
const MONTHS_OF_HISTORY = 24;


/*
  Month by month, with each month compared to the one before it.

  Three SQL ideas are doing the work here, and each replaces a loop that used
  to live in JavaScript.

  ROUND(...) computes the share of income kept in the query rather than after
  it. NULLIF(income, 0) turns a zero income into NULL, and dividing by NULL
  gives NULL rather than an error, which is how SQL avoids dividing by zero.

  SUM(...) OVER (ORDER BY month) is a window function. An ordinary SUM collapses
  every row into one; a window function keeps the rows and adds a column, so
  each month can carry the running total of everything kept up to and including
  it. Doing that in JavaScript means a loop and a variable that is added to as
  it goes.

  LAG(...) OVER (ORDER BY month) reaches back to the previous row. It is what
  makes "you kept ₹4,000 more than last month" possible without loading last
  month separately.

  The subquery runs first and picks the most recent months, newest first. The
  outer query then puts them back in date order, because a running total has to
  be built oldest to newest or it means nothing.
*/
export function monthlyTrend(userId) {
  const rows = db.prepare(`
    SELECT
      month,
      income,
      spent,
      saved,
      invested,
      saved + invested                                   AS kept,
      ROUND((saved + invested) * 100.0 / NULLIF(income, 0), 1) AS kept_percent,
      SUM(saved + invested) OVER (ORDER BY month)        AS kept_running_total,
      LAG(saved + invested)  OVER (ORDER BY month)       AS kept_last_month
    FROM (
      SELECT * FROM checkins
      WHERE user_id = ?
      ORDER BY month DESC
      LIMIT ?
    )
    ORDER BY month ASC
  `).all(userId, MONTHS_OF_HISTORY);

  return rows.map((row) => {
    /*
      kept_last_month is NULL on the very first month, because there is nothing
      before it to compare against. SQL NULL arrives in JavaScript as null, and
      null minus a number is not what anybody wants on a page, so the change is
      left as null and the caller decides what to show.
    */
    let changeFromLastMonth = null;

    if (row.kept_last_month !== null) {
      changeFromLastMonth = row.kept - row.kept_last_month;
    }

    return {
      month: row.month,
      income: row.income,
      spent: row.spent,
      saved: row.saved,
      invested: row.invested,
      kept: row.kept,
      keptPercent: row.kept_percent,
      keptRunningTotal: row.kept_running_total,
      changeFromLastMonth: changeFromLastMonth,
    };
  });
}


/*
  One row summarising every month on record.

  COUNT, SUM, AVG, MIN and MAX in a single pass. The alternative is fetching
  every row and walking it five times, or once with five accumulators.

  A person with no check-ins still gets a row back, because these functions
  always return something: COUNT gives 0 and the rest give NULL. COALESCE turns
  those NULLs into zeros so the caller never has to check.
*/
export function overallSummary(userId) {
  const row = db.prepare(`
    SELECT
      COUNT(*)                                    AS months_recorded,
      COALESCE(SUM(income), 0)                    AS total_income,
      COALESCE(SUM(spent), 0)                     AS total_spent,
      COALESCE(SUM(saved + invested), 0)          AS total_kept,
      COALESCE(ROUND(AVG(income), 0), 0)          AS average_income,
      COALESCE(ROUND(
        AVG((saved + invested) * 100.0 / NULLIF(income, 0)), 1
      ), 0)                                       AS average_kept_percent,
      MIN(month)                                  AS first_month,
      MAX(month)                                  AS last_month
    FROM checkins
    WHERE user_id = ?
  `).get(userId);

  return {
    monthsRecorded: row.months_recorded,
    totalIncome: row.total_income,
    totalSpent: row.total_spent,
    totalKept: row.total_kept,
    averageIncome: row.average_income,
    averageKeptPercent: row.average_kept_percent,
    firstMonth: row.first_month,
    lastMonth: row.last_month,
  };
}


/*
  The best and worst months, in one query.

  A CTE, written WITH ... AS (...), names a temporary result so the rest of the
  query can use it twice without repeating it. Here it works out the kept share
  once, and then two small selects pick the highest and the lowest from it.

  Each of those two is wrapped in its own brackets before the UNION ALL. SQLite
  refuses ORDER BY on the arms of a union directly, because it cannot tell
  whether the ordering is meant for that arm or for the combined result. The
  brackets make it one finished result being unioned to another, which is what
  is actually meant.

  Months with no income are dropped, because a share of zero income is not a
  bad month, it is a missing one, and letting it win "worst month" would be a
  lie told with correct arithmetic.
*/
export function bestAndWorstMonth(userId) {
  const rows = db.prepare(`
    WITH scored AS (
      SELECT
        month,
        saved + invested AS kept,
        (saved + invested) * 100.0 / income AS kept_percent
      FROM checkins
      WHERE user_id = ? AND income > 0
    )
    SELECT 'best' AS which, month, kept, ROUND(kept_percent, 1) AS kept_percent
    FROM (SELECT * FROM scored ORDER BY kept_percent DESC, month DESC LIMIT 1)

    UNION ALL

    SELECT 'worst' AS which, month, kept, ROUND(kept_percent, 1) AS kept_percent
    FROM (SELECT * FROM scored ORDER BY kept_percent ASC, month ASC LIMIT 1)
  `).all(userId);

  let best = null;
  let worst = null;

  rows.forEach((row) => {
    const entry = {
      month: row.month,
      kept: row.kept,
      keptPercent: row.kept_percent,
    };

    if (row.which === 'best') {
      best = entry;
    } else {
      worst = entry;
    }
  });

  return { best: best, worst: worst };
}


/*
  What is owed, grouped by kind of debt, with each kind's share of the total.

  GROUP BY is the whole point: one row per kind, however many debts there are.
  The share is worked out against a scalar subquery, which is a query in
  brackets that returns a single value, so every row can be divided by the same
  total without fetching it separately.

  ORDER BY total DESC puts the biggest first, which is the order somebody needs
  to act in.
*/
export function debtsByKind(userId) {
  const rows = db.prepare(`
    SELECT
      kind,
      COUNT(*)                  AS count,
      SUM(principal)            AS total,
      SUM(emi)                  AS total_emi,
      ROUND(MAX(annual_rate), 2) AS highest_rate,
      ROUND(
        SUM(principal) * 100.0
        / NULLIF((SELECT SUM(principal) FROM debts WHERE user_id = ?), 0),
        1
      )                         AS share_of_total
    FROM debts
    WHERE user_id = ?
    GROUP BY kind
    ORDER BY total DESC
  `).all(userId, userId);

  return rows.map((row) => {
    return {
      kind: row.kind,
      count: row.count,
      total: row.total,
      totalEmi: row.total_emi,
      highestRate: row.highest_rate,
      shareOfTotal: row.share_of_total,
    };
  });
}


/* The same shape for what is owned. Replaces groupAssetsByKind in the browser. */
export function assetsByKind(userId) {
  const rows = db.prepare(`
    SELECT
      kind,
      COUNT(*)       AS count,
      SUM(value)     AS total,
      ROUND(
        SUM(value) * 100.0
        / NULLIF((SELECT SUM(value) FROM assets WHERE user_id = ?), 0),
        1
      )              AS share_of_total
    FROM assets
    WHERE user_id = ?
    GROUP BY kind
    ORDER BY total DESC
  `).all(userId, userId);

  return rows.map((row) => {
    return {
      kind: row.kind,
      count: row.count,
      total: row.total,
      shareOfTotal: row.share_of_total,
    };
  });
}


/*
  Everything at once, for GET /api/insights.

  Five queries rather than one enormous one. They could be forced together with
  joins, and the result would be slower to run and far harder to read: joining
  check-ins to debts to assets multiplies the rows before grouping them back
  down, which is a classic way to produce totals that are quietly too big.

  Five small indexed queries against one local SQLite file is a few
  milliseconds. Clarity is worth more than that here.
*/
export function buildInsights(userId) {
  const extremes = bestAndWorstMonth(userId);

  return {
    summary: overallSummary(userId),
    months: monthlyTrend(userId),
    bestMonth: extremes.best,
    worstMonth: extremes.worst,
    debtsByKind: debtsByKind(userId),
    assetsByKind: assetsByKind(userId),
  };
}
