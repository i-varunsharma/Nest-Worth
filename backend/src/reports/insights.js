import db from '../database/db.js';

/*
  Reporting queries for GET /api/insights.

  These answers are one number each (an average, a running total, a share), so they
  are worked out in SQL where the data is, instead of sending every row to
  JavaScript. Every varying value is a ? parameter.
*/


// Two years of history. Enough to see a trend, small enough to stay quick.
const MONTHS_OF_HISTORY = 24;


/*
  Month by month, each compared with the one before.

    NULLIF(income, 0)            avoids dividing by zero (dividing by NULL gives NULL)
    SUM(...) OVER (ORDER BY ...)  a window function: the running total on each row
    LAG(...) OVER (ORDER BY ...)  the previous month's value on the same row

  The inner query picks the newest months; the outer one orders them oldest first,
  which a running total needs.
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
    // The first month has no previous month, so its change stays null.
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


// One summary row: COUNT, SUM, AVG, MIN and MAX in one pass. COALESCE turns the
// NULLs these return for no rows into zeros.
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
  The best and worst month in one query. The WITH clause works out each month's
  kept share once, and two selects take the top and bottom. Each is bracketed
  because SQLite does not allow ORDER BY directly on the arms of a UNION. Months
  with no income are left out: they are missing data, not bad months.
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


// Debts grouped by kind, each with its share of the total. The total comes from a
// scalar subquery, so every row divides by the same value.
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


// Everything for GET /api/insights. Five small indexed queries rather than one
// join, which would multiply rows before grouping and risk inflated totals.
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
