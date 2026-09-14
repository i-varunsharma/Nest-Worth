import db from '../database/db.js';
import { formatRupees } from '../../../shared/plan.js';

/*
  What changed, worked out in SQL before any AI is involved.

  This is the part of the coach that nobody asks for. The card on the dashboard
  is a conversation: you ask, it answers. Useful, and it only ever tells you
  what you already thought to ask about. A month where the food spend doubled is
  not a question anybody thinks to type.

  ---- Why the detecting is not done by the model ----

  It would be one prompt to hand a language model the whole account and ask it
  what stands out. That design has a specific failure: the model decides what is
  true AND how to say it, so a wrong reading and a good sentence arrive
  together and are indistinguishable. It is also different every time it runs on
  identical data, which makes it impossible to test.

  So the split here is deliberate. Every fact below is found by a query, with a
  number attached, and it either happened or it did not. The model is given
  those findings and asked only to write them up. It cannot invent a trend that
  is not in this file, because the only material it gets is what these functions
  found.

  Each signal is:

    { code, importance, fact, detail }

  code       a name, so the same finding can be recognised between days
  importance 1 to 3, highest first. Only the top few are shown.
  fact       one plain sentence, already true and already readable. Written out
             properly, amounts and all, because when no model is configured
             these sentences ARE what the dashboard shows
  detail     the numbers behind it, for the model to work from
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


/*
  Each spending category this month against the same category last month.

  The join is the interesting part. Both sides are the same query over different
  months, and joining them on the category is what turns two lists into one list
  of pairs. Doing it in JavaScript means building a lookup from one list and
  walking the other against it, which is the same thing written longer.

  A LEFT JOIN, so a category that is new this month still appears, with NULL for
  last month. A plain JOIN would silently drop exactly the categories worth
  knowing about: the ones that did not exist before.
*/
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


/*
  Turns those pairs into signals, keeping only the ones worth saying out loud.

  Investing is checked in the opposite direction from everything else: spending
  more on food is worth a mention, and so is putting away LESS. Treating them
  the same would congratulate somebody for cutting their SIP.
*/
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


/*
  Did the plan actually happen.

  A check-in records what really went out. The plan says what should have. This
  compares the two on the one figure that matters, the share of income kept,
  because comparing rupees would call a good month bad whenever the income moved.
*/
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


/*
  The most expensive debt, when it is expensive enough to be the whole answer.

  A card at 42 per cent is not one item on a list of things to think about. It
  beats every other use of a spare rupee by so much that mentioning anything
  else alongside it would be misleading.
*/
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


/*
  One payment much larger than the rest of the month.

  Worth pointing at because it distorts everything above it. A month with a
  laptop in it does not mean the shopping habit changed, and a breakdown that
  does not say so invites exactly that conclusion.
*/
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


/*
  Everything, in the order it should be read.

  month is 'YYYY-MM', normally the most recent month with transactions in it.
*/
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
