import db from '../database/db.js';
import { formatRupees } from '../../../shared/plan.js';

/*
  Findings for the daily note: what changed in the account, found in SQL before
  any model is involved.

  The model only writes these up. Detecting and wording together would let a wrong
  reading arrive in a convincing sentence, and would give different answers on
  the same data, which cannot be tested.

  Each signal is { code, importance, fact, detail }:
    code        a stable name for the finding
    importance  1 to 3, highest first; only the top few are shown
    fact        one complete sentence, shown as it is when no model is configured
    detail      the numbers behind it
*/

// How far apart two months have to be before a change is worth mentioning.
// Below this it is noise: nobody spends the same amount on food twice.
const MEANINGFUL_CHANGE = 25;

// And it has to be a real amount of money, not 25% of nothing.
const MEANINGFUL_AMOUNT = 1000;


/* '2026-08' for the month before the one given. */
function previousMonth(month) {
  const year = Number(month.slice(0, 4));
  const number = Number(month.slice(5, 7));

  if (number === 1) {
    return (year - 1) + '-12';
  }

  const earlier = number - 1;

  return year + '-' + String(earlier).padStart(2, '0');
}


// Each spending category this month next to the same category last month. A LEFT
// JOIN, so a category that is new this month still appears, with NULL for last month.
export function spendingChanges(userId, month) {
  const rows = db.prepare(`
    SELECT
      now.category                AS category,
      now.total                   AS thisMonth,
      COALESCE(before.total, 0)   AS lastMonth
    FROM (
      SELECT category, SUM(amount) AS total
      FROM transactions
      WHERE user_id = ? AND direction = 'debit' AND occurred_on LIKE ?
      GROUP BY category
    ) AS now
    LEFT JOIN (
      SELECT category, SUM(amount) AS total
      FROM transactions
      WHERE user_id = ? AND direction = 'debit' AND occurred_on LIKE ?
      GROUP BY category
    ) AS before
      ON before.category = now.category
    ORDER BY now.total DESC
  `).all(userId, month + '%', userId, previousMonth(month) + '%');

  return rows;
}


// Keeps the changes worth mentioning. Investing is read the opposite way to
// spending: putting away less is the change worth pointing out.
function changeSignals(userId, month) {
  const signals = [];
  const rows = spendingChanges(userId, month);

  // Nothing to compare against. Said plainly rather than left as silence,
  // because "no signals" and "no history" look identical on a dashboard.
  let hasLastMonth = false;

  for (const row of rows) {
    if (row.lastMonth > 0) {
      hasLastMonth = true;
    }
  }

  if (hasLastMonth === false) {
    return signals;
  }

  for (const row of rows) {
    if (row.lastMonth === 0) {
      continue;
    }

    const difference = row.thisMonth - row.lastMonth;
    const percent = (difference / row.lastMonth) * 100;

    if (Math.abs(percent) < MEANINGFUL_CHANGE) {
      continue;
    }

    if (Math.abs(difference) < MEANINGFUL_AMOUNT) {
      continue;
    }

    let direction = 'up';
    if (difference < 0) {
      direction = 'down';
    }

    // A rise matters more than a fall, and a big rise more than a small one.
    let importance = 2;

    if (direction === 'up' && Math.abs(percent) >= 50) {
      importance = 1;
    }

    if (direction === 'down') {
      importance = 3;
    }

    signals.push({
      code: 'spend_' + direction + '_' + row.category,
      importance: importance,
      fact: 'Spending on ' + row.category + ' went ' + direction + ' from about '
        + formatRupees(row.lastMonth) + ' to about ' + formatRupees(row.thisMonth)
        + ', a change of ' + Math.round(Math.abs(percent)) + ' per cent.',
      detail: {
        category: row.category,
        lastMonth: Math.round(row.lastMonth),
        thisMonth: Math.round(row.thisMonth),
        percent: Math.round(percent),
      },
    });
  }

  return signals;
}


// Whether the plan happened, compared on the share of income kept, so a change in
// income does not make a good month look bad.
function checkinSignals(userId) {
  const latest = db.prepare(`
    SELECT month, income, spent, saved, invested
    FROM checkins
    WHERE user_id = ?
    ORDER BY month DESC
    LIMIT 1
  `).get(userId);

  if (!latest) {
    return [];
  }

  if (latest.income <= 0) {
    return [];
  }

  const keptShare = ((latest.saved + latest.invested) / latest.income) * 100;

  const signals = [];

  if (keptShare < 5) {
    signals.push({
      code: 'kept_very_little',
      importance: 1,
      fact: 'In ' + latest.month + ' only about ' + Math.round(keptShare)
        + ' per cent of what came in was kept.',
      detail: { month: latest.month, keptShare: Math.round(keptShare) },
    });
  }

  if (keptShare >= 25) {
    signals.push({
      code: 'kept_well',
      importance: 3,
      fact: 'In ' + latest.month + ' about ' + Math.round(keptShare)
        + ' per cent of what came in was kept, which is a strong month.',
      detail: { month: latest.month, keptShare: Math.round(keptShare) },
    });
  }

  return signals;
}


// An expensive debt is the whole answer when its rate beats every other use of a
// spare rupee.
function debtSignals(userId) {
  const worst = db.prepare(`
    SELECT name, annual_rate, principal
    FROM debts
    WHERE user_id = ?
    ORDER BY annual_rate DESC
    LIMIT 1
  `).get(userId);

  if (!worst) {
    return [];
  }

  if (worst.annual_rate < 15) {
    return [];
  }

  return [{
    code: 'expensive_debt',
    importance: 1,
    fact: worst.name + ' is at ' + worst.annual_rate + ' per cent a year, with about '
      + formatRupees(worst.principal) + ' left on it.',
    detail: {
      name: worst.name,
      rate: worst.annual_rate,
      principal: Math.round(worst.principal),
    },
  }];
}


// One payment far larger than the rest of the month, such as a laptop, which
// would otherwise look like a change in habit.
function largestPaymentSignal(userId, month) {
  const biggest = db.prepare(`
    SELECT description, amount, category
    FROM transactions
    WHERE user_id = ? AND direction = 'debit' AND occurred_on LIKE ?
    ORDER BY amount DESC
    LIMIT 1
  `).get(userId, month + '%');

  if (!biggest) {
    return [];
  }

  const spent = db.prepare(`
    SELECT SUM(amount) AS total
    FROM transactions
    WHERE user_id = ? AND direction = 'debit' AND occurred_on LIKE ?
  `).get(userId, month + '%');

  if (!spent.total || spent.total <= 0) {
    return [];
  }

  const share = (biggest.amount / spent.total) * 100;

  // A quarter of everything that left the account in one payment.
  if (share < 25) {
    return [];
  }

  return [{
    code: 'one_big_payment',
    importance: 2,
    fact: 'One payment, ' + biggest.description + ', was ' + formatRupees(biggest.amount)
      + ', which is ' + Math.round(share)
      + ' per cent of everything that left the account.',
    detail: {
      description: biggest.description,
      amount: Math.round(biggest.amount),
      share: Math.round(share),
    },
  }];
}


// All signals in reading order. month is 'YYYY-MM', usually the latest imported month.
export function findSignals(userId, month) {
  let signals = [];

  signals = signals.concat(debtSignals(userId));
  signals = signals.concat(checkinSignals(userId));

  if (month) {
    signals = signals.concat(changeSignals(userId, month));
    signals = signals.concat(largestPaymentSignal(userId, month));
  }

  // Most important first. sort compares two at a time and wants a negative
  // number when the first should come earlier, which subtracting gives.
  signals.sort((first, second) => {
    return first.importance - second.importance;
  });

  return signals;
}


/* The newest month this person has transactions for, or an empty string. */
export function latestImportedMonth(userId) {
  const row = db.prepare(`
    SELECT substr(occurred_on, 1, 7) AS month
    FROM transactions
    WHERE user_id = ?
    ORDER BY occurred_on DESC
    LIMIT 1
  `).get(userId);

  if (!row) {
    return '';
  }

  return row.month;
}
