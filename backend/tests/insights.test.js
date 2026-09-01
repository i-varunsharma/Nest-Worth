import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/*
  Tests for the reporting queries. Run with: npm test

  These matter more than they look. A wrong aggregate does not throw and does
  not look wrong: it returns a number, in the right format, in the right place
  on the page, and it is simply not true. An average that quietly includes the
  months with no income, or a share that adds up to 103%, will sit there being
  believed for months.

  So every expected value below is worked out by hand in a comment. Asserting
  against what the query happens to return today only proves it has not changed.
*/

const temporaryFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'nestworth-insights-'));
process.env.NESTWORTH_DB_FILE = path.join(temporaryFolder, 'test.db');

const db = (await import('../src/database/db.js')).default;
const {
  assetsByKind,
  bestAndWorstMonth,
  buildInsights,
  debtsByKind,
  monthlyTrend,
  overallSummary,
} = await import('../src/lib/insights.js');

const now = new Date().toISOString();

db.prepare('INSERT INTO users (name, email, created_at) VALUES (?, ?, ?)')
  .run('Test Person', 'insights@example.com', now);

// A second person, whose rows must never appear in the first person's totals.
db.prepare('INSERT INTO users (name, email, created_at) VALUES (?, ?, ?)')
  .run('Somebody Else', 'other@example.com', now);

// A third, with nothing at all.
db.prepare('INSERT INTO users (name, email, created_at) VALUES (?, ?, ?)')
  .run('Empty', 'empty@example.com', now);

/*
  Four months for person 1.

  month     income  spent  saved  invested   kept   kept%
  2026-05   60000   44000  10000  6000       16000  26.7
  2026-06   60000   52000  5000   3000       8000   13.3
  2026-07   0       20000  0      0          0      none: no income
  2026-08   80000   40000  15000  15000      30000  37.5
*/
const checkins = [
  ['2026-05', 60000, 44000, 10000, 6000],
  ['2026-06', 60000, 52000, 5000, 3000],
  ['2026-07', 0, 20000, 0, 0],
  ['2026-08', 80000, 40000, 15000, 15000],
];

for (const row of checkins) {
  db.prepare(`
    INSERT INTO checkins (user_id, month, income, spent, saved, invested, note, created_at)
    VALUES (1, ?, ?, ?, ?, ?, '', ?)
  `).run(row[0], row[1], row[2], row[3], row[4], now);
}

// A month belonging to somebody else, in the same range.
db.prepare(`
  INSERT INTO checkins (user_id, month, income, spent, saved, invested, note, created_at)
  VALUES (2, '2026-06', 500000, 100000, 200000, 200000, '', ?)
`).run(now);

// Two credit cards and one education loan: 84000 + 30000 + 410000 = 524000
const debts = [
  ['Card A', 'credit_card', 84000, 42, 2800],
  ['Card B', 'credit_card', 30000, 38, 1500],
  ['Education loan', 'education', 410000, 8.4, 7200],
];

for (const row of debts) {
  db.prepare(`
    INSERT INTO debts (user_id, name, kind, principal, annual_rate, emi, created_at, updated_at)
    VALUES (1, ?, ?, ?, ?, ?, ?, ?)
  `).run(row[0], row[1], row[2], row[3], row[4], now, now);
}

// 95000 + 50000 + 55000 = 200000, which makes the shares easy to check by eye.
const assets = [
  ['Savings', 'cash', 95000],
  ['FD', 'fd', 50000],
  ['SIP', 'mutual_fund', 55000],
];

for (const row of assets) {
  db.prepare(`
    INSERT INTO assets (user_id, name, kind, value, created_at, updated_at)
    VALUES (1, ?, ?, ?, ?, ?)
  `).run(row[0], row[1], row[2], now, now);
}


// ---------------------------------------------------------------
// The monthly trend
// ---------------------------------------------------------------

test('the running total is built oldest to newest and never resets', () => {
  /*
    The window function SUM(...) OVER (ORDER BY month) is what produces this.
    The rows are picked newest-first by the inner query, to take the most recent
    24, and then put back in date order by the outer one. Get that ordering
    wrong and the running total counts backwards, which looks plausible and is
    completely wrong.

    16000, then +8000 = 24000, then +0 = 24000, then +30000 = 54000.
  */
  const months = monthlyTrend(1);

  assert.equal(months.length, 4);
  assert.equal(months[0].month, '2026-05', 'oldest first');
  assert.equal(months[3].month, '2026-08', 'newest last');

  assert.equal(months[0].keptRunningTotal, 16000);
  assert.equal(months[1].keptRunningTotal, 24000);
  assert.equal(months[2].keptRunningTotal, 24000);
  assert.equal(months[3].keptRunningTotal, 54000);
});


test('each month is compared with the one before it', () => {
  // LAG() does this. The first month has nothing before it, so the comparison
  // is null rather than a made-up zero: "no change" and "no previous month"
  // are different things and the page shows them differently.
  const months = monthlyTrend(1);

  assert.equal(months[0].changeFromLastMonth, null);
  assert.equal(months[1].changeFromLastMonth, 8000 - 16000);
  assert.equal(months[2].changeFromLastMonth, 0 - 8000);
  assert.equal(months[3].changeFromLastMonth, 30000 - 0);
});


test('a month with no income does not divide by zero', () => {
  /*
    July has an income of 0. Dividing by it would give Infinity, which prints
    as "Infinity%" on a page and is worse than showing nothing. NULLIF turns
    the zero into NULL first, and anything divided by NULL is NULL.
  */
  const july = monthlyTrend(1)[2];

  assert.equal(july.month, '2026-07');
  assert.equal(july.keptPercent, null);
});


test('the trend never includes another person’s months', () => {
  const months = monthlyTrend(1);

  for (const month of months) {
    assert.notEqual(month.income, 500000, 'that is the other person’s month');
  }
});


// ---------------------------------------------------------------
// The overall summary
// ---------------------------------------------------------------

test('the totals add up to what was put in', () => {
  const summary = overallSummary(1);

  assert.equal(summary.monthsRecorded, 4);
  assert.equal(summary.totalIncome, 60000 + 60000 + 0 + 80000);
  assert.equal(summary.totalSpent, 44000 + 52000 + 20000 + 40000);
  assert.equal(summary.totalKept, 16000 + 8000 + 0 + 30000);
  assert.equal(summary.firstMonth, '2026-05');
  assert.equal(summary.lastMonth, '2026-08');
});


test('the average kept share ignores months with no income', () => {
  /*
    This is the one most worth pinning down.

    AVG in SQL skips NULLs rather than counting them as zero, and the share for
    July is NULL because of the NULLIF. So the average is over the three months
    that had an income, not four:

      (26.7 + 13.3 + 37.5) / 3 = 25.83, rounded to 25.8

    Counting July as a zero would drag it to 19.4 and tell somebody they are
    doing far worse than they are, on the strength of a month they never earned
    in.
  */
  const summary = overallSummary(1);

  assert.equal(summary.averageKeptPercent, 25.8);
});


test('somebody with nothing recorded gets zeros, not nulls', () => {
  // SUM and AVG over no rows return NULL in SQL. Without COALESCE those reach
  // the page as "₹null".
  const summary = overallSummary(3);

  assert.equal(summary.monthsRecorded, 0);
  assert.equal(summary.totalIncome, 0);
  assert.equal(summary.totalKept, 0);
  assert.equal(summary.averageKeptPercent, 0);
  assert.equal(summary.firstMonth, null);
});


// ---------------------------------------------------------------
// Best and worst month
// ---------------------------------------------------------------

test('the best and worst months are picked on share, not on amount', () => {
  /*
    August kept the most rupees AND the biggest share, so it wins either way.
    June is the honest worst at 13.3%.

    July kept nothing at all, which would make it the worst by amount. It is
    excluded because it had no income: a month you did not earn in is a missing
    month, not a bad one, and calling it your worst would be a lie told with
    correct arithmetic.
  */
  const extremes = bestAndWorstMonth(1);

  assert.equal(extremes.best.month, '2026-08');
  assert.equal(extremes.best.keptPercent, 37.5);

  assert.equal(extremes.worst.month, '2026-06');
  assert.equal(extremes.worst.keptPercent, 13.3);
});


test('no months at all means no best and no worst', () => {
  const extremes = bestAndWorstMonth(3);

  assert.equal(extremes.best, null);
  assert.equal(extremes.worst, null);
});


// ---------------------------------------------------------------
// Grouping
// ---------------------------------------------------------------

test('debts are grouped by kind, with the biggest group first', () => {
  /*
    GROUP BY collapses the two credit cards into one row.

      education    410000  -> 78.2% of 524000
      credit_card  114000  -> 21.8%
  */
  const groups = debtsByKind(1);

  assert.equal(groups.length, 2);

  assert.equal(groups[0].kind, 'education');
  assert.equal(groups[0].count, 1);
  assert.equal(groups[0].total, 410000);
  assert.equal(groups[0].shareOfTotal, 78.2);

  assert.equal(groups[1].kind, 'credit_card');
  assert.equal(groups[1].count, 2, 'both cards in one row');
  assert.equal(groups[1].total, 114000);
  assert.equal(groups[1].totalEmi, 2800 + 1500);

  // MAX picks the worse of the two card rates, which is the one worth naming.
  assert.equal(groups[1].highestRate, 42);
});


test('assets are grouped the same way and the shares add up to 100', () => {
  /*
    A share that does not add to 100 is the classic sign of a total taken from
    the wrong place: a join that multiplied rows, or a filter on the outer query
    that the subquery does not have.

    95000 / 200000 = 47.5, 55000 = 27.5, 50000 = 25. Total 100.
  */
  const groups = assetsByKind(1);

  let total = 0;

  for (const group of groups) {
    total = total + group.shareOfTotal;
  }

  assert.equal(total, 100);
  assert.equal(groups[0].kind, 'cash');
  assert.equal(groups[0].shareOfTotal, 47.5);
});


test('grouping never reaches another person’s rows', () => {
  assert.equal(debtsByKind(3).length, 0);
  assert.equal(assetsByKind(3).length, 0);
});


// ---------------------------------------------------------------
// The whole thing
// ---------------------------------------------------------------

test('buildInsights returns every section, even when empty', () => {
  // The frontend reads all six. A missing one is a crash rather than a blank,
  // so an account with nothing in it still has to produce the full shape.
  const insights = buildInsights(3);

  assert.ok(insights.summary);
  assert.deepEqual(insights.months, []);
  assert.equal(insights.bestMonth, null);
  assert.equal(insights.worstMonth, null);
  assert.deepEqual(insights.debtsByKind, []);
  assert.deepEqual(insights.assetsByKind, []);
});
