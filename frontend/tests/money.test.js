import { test } from 'vitest';
import assert from 'node:assert/strict';
import { buildPlan, bucketAmount, formatRupees, ASSUMED_YEARLY_RETURN } from '../src/lib/plan.js';
import { payoff, summariseDebts, monthsFromNow, formatDuration, orderByRate } from '../src/lib/debt.js';
import { describeGoal, summariseGoals, safetyNet, monthsUntil } from '../src/lib/goals.js';
import { summariseNetWorth, groupAssetsByKind } from '../src/lib/networth.js';
import { summariseCheckins, keptShareOf, hasCheckinFor, monthLabel } from '../src/lib/checkins.js';

/*
  Tests for the money maths. Run with: npm test

  These files are the ones worth testing hardest. A mistake in a component makes
  something look wrong; a mistake in here quietly tells somebody the wrong thing
  to do with their money, and it looks completely convincing while it does it.

  Nothing in src/lib imports React, so these run in plain Node with no test
  framework, no build step and no browser, exactly like the backend tests.

  Several of the tests below are marked "regression". Those describe bugs that
  were really in this code, and they exist to stop each one coming back.
*/


// ---------------------------------------------------------------
// Paying off a loan
// ---------------------------------------------------------------

test('payoff clears an ordinary loan and counts the months', () => {
  const result = payoff(300000, 9.5, 9000, 0);

  assert.equal(result.clears, true);
  assert.ok(result.months > 0 && result.months < 60);

  // Interest has to be a real cost, not zero.
  assert.ok(result.totalInterest > 0);

  // You always pay back more than you borrowed.
  assert.ok(result.totalPaid > 300000);
});


test('payoff refuses a loan whose EMI is below the interest', () => {
  // ₹1,00,000 at 40% is about ₹3,333 of interest a month. Paying ₹100 means
  // the balance grows forever.
  const result = payoff(100000, 40, 100, 0);

  assert.equal(result.clears, false);
  assert.equal(result.reason, 'interest');

  // It says how much more per month it would take just to stand still.
  assert.ok(result.shortfall > 0);
});


test('regression: payoff refuses a loan that never finishes inside the cap', () => {
  /*
    An EMI a single rupee above the first month's interest does reduce the
    balance, so the loop makes progress and never trips the check above. It
    just makes so little progress that fifty years later almost all of it is
    still owing.

    This used to return clears: true with months: 600, and the app printed a
    confident payoff date for a loan somebody would still be paying in their
    eighties.
  */
  const result = payoff(1000000, 12, 10001, 0);

  assert.equal(result.clears, false);
  assert.equal(result.reason, 'tooSlow');

  // Nearly all of the original balance is still there.
  assert.ok(result.remainingAfterCap > 900000);
});


test('paying extra clears the loan sooner and costs less', () => {
  const plain = payoff(300000, 9.5, 9000, 0);
  const extra = payoff(300000, 9.5, 9000, 3000);

  assert.ok(extra.months < plain.months);
  assert.ok(extra.totalInterest < plain.totalInterest);
});


test('regression: a payoff date on the 31st does not skip a month', () => {
  /*
    monthsFromNow used to add months to today's date. Asking for the 31st of a
    30 day month rolls forward into the next one, so on the 29th, 30th or 31st
    every payoff date on the page was a month late.

    Checking it from a fixed 31st rather than from today, so the test means the
    same thing whenever it runs.
  */
  const may31 = new Date(2026, 4, 31);

  const oneMonthOn = new Date(may31);
  oneMonthOn.setDate(1);
  oneMonthOn.setMonth(oneMonthOn.getMonth() + 1);

  assert.equal(oneMonthOn.getMonth(), 5, 'one month after May must be June');

  // And the real function never lands on a day that could roll over.
  assert.equal(monthsFromNow(1).getDate(), 1);
});


test('summariseDebts reports that not everything clears', () => {
  const summary = summariseDebts([
    { principal: 100000, annualRate: 10, emi: 5000 },
    { principal: 100000, annualRate: 40, emi: 100 },
  ]);

  assert.equal(summary.everythingClears, false);

  // With no honest date to give, it gives none rather than a wrong one.
  assert.equal(summary.debtFreeDate, null);

  // The EMIs still add up, because those are known either way.
  assert.equal(summary.totalEmi, 5100);
});


test('orderByRate puts the most expensive debt first and leaves the original alone', () => {
  const debts = [
    { name: 'home', annualRate: 8.5 },
    { name: 'card', annualRate: 42 },
    { name: 'car', annualRate: 9.5 },
  ];

  const ordered = orderByRate(debts);

  assert.equal(ordered[0].name, 'card');

  // sort() rearranges in place, so the function has to copy first. Quietly
  // reordering a list you were handed is a rude thing for a function to do.
  assert.equal(debts[0].name, 'home');
});


test('formatDuration says it the way a person would', () => {
  assert.equal(formatDuration(0), 'now');
  assert.equal(formatDuration(1), '1 month');
  assert.equal(formatDuration(7), '7 months');
  assert.equal(formatDuration(12), '1 year');
  assert.equal(formatDuration(13), '1 year 1 month');
  assert.equal(formatDuration(25), '2 years 1 month');
});


// ---------------------------------------------------------------
// The plan
// ---------------------------------------------------------------

test('the three shares always add up to exactly 100', () => {
  /*
    The shares are nudged by income, dependents, a loan and a variable income,
    then clamped, then scaled back to 100. Any of those steps could leave a
    rounding crumb, and the pie chart on the page would not close.
  */
  const incomes = [20000, 35000, 62000, 80000, 150000, 400000];
  const dependentCounts = [0, 1, 2, 3];
  const loanStates = [true, false];
  const varyStates = [true, false];

  for (const income of incomes) {
    for (const dependents of dependentCounts) {
      for (const hasLoan of loanStates) {
        for (const incomeVaries of varyStates) {
          const plan = buildPlan({ income, dependents, hasLoan, incomeVaries });

          let total = 0;
          for (const bucket of plan.buckets) {
            total = total + bucket.percent;
          }

          assert.equal(total, 100, `${income}/${dependents}/${hasLoan}/${incomeVaries}`);
        }
      }
    }
  }
});


test('an expensive debt holds investing back, a cheap one does not', () => {
  const base = { income: 90000, dependents: 1, hasLoan: true, emi: 12000 };

  const card = buildPlan({ ...base, topRate: 42, topDebtName: 'credit card' });
  const home = buildPlan({ ...base, topRate: 8.4, topDebtName: 'home loan' });

  // A home loan below the assumed market return should not be rushed.
  assert.ok(
    bucketAmount(home, 'invest') > bucketAmount(card, 'invest'),
    'a cheap loan should leave more going into investments',
  );
});


test('an unknown debt rate is treated as the expensive case', () => {
  /*
    This is the landing page, before anybody has entered a real debt. Guessing
    "cheap" would tell somebody to invest through a credit card at 42%, so the
    cautious assumption is the right default.
  */
  const base = { income: 90000, dependents: 1, hasLoan: true, emi: 12000 };

  const unknown = buildPlan(base);
  const expensive = buildPlan({ ...base, topRate: 42, topDebtName: 'card' });

  assert.equal(bucketAmount(unknown, 'invest'), bucketAmount(expensive, 'invest'));
});


test('a variable income moves money from investing into savings', () => {
  const base = { income: 90000, dependents: 0, hasLoan: false };

  const steady = buildPlan(base);
  const varies = buildPlan({ ...base, incomeVaries: true });

  assert.ok(bucketAmount(varies, 'save') > bucketAmount(steady, 'save'));
  assert.ok(bucketAmount(varies, 'invest') < bucketAmount(steady, 'invest'));

  // It comes out of investing, not out of spending. A freelancer's problem is
  // a thin month with nothing set aside, not overspending in a good one.
  assert.equal(bucketAmount(varies, 'spend'), bucketAmount(steady, 'spend'));
});


test('living costs come out before the split', () => {
  const base = { income: 80000, dependents: 1, hasLoan: false };

  const unanswered = buildPlan(base);
  const modest = buildPlan({ ...base, essentialCosts: 20000 });
  const metro = buildPlan({ ...base, essentialCosts: 35000 });

  // Each step of rent leaves less to divide up.
  assert.ok(modest.free < unanswered.free);
  assert.ok(metro.free < modest.free);

  // And therefore asks for less to be put aside.
  const keptOf = (plan) => bucketAmount(plan, 'save') + bucketAmount(plan, 'invest');
  assert.ok(keptOf(metro) < keptOf(modest));
});


test('a household paying metro rent is not asked to keep half its income', () => {
  /*
    The model used to ignore rent entirely, so a household at 80,000 with one
    dependent was told to keep 48% of income whether their rent was 8,000 or
    35,000. That is not an ambitious plan, it is arithmetic that has not met
    the person reading it.
  */
  const plan = buildPlan({ income: 80000, dependents: 1, hasLoan: false, essentialCosts: 35000 });

  const kept = bucketAmount(plan, 'save') + bucketAmount(plan, 'invest');
  const keptShare = (kept / plan.income) * 100;

  assert.ok(keptShare < 30, `asked for ${keptShare.toFixed(0)}% of income`);
});


test('unanswered living costs behave exactly as before', () => {
  // Somebody who onboarded before the question existed has zero stored, and
  // their plan must not change under them.
  const base = { income: 80000, dependents: 1, hasLoan: false };

  const zero = buildPlan({ ...base, essentialCosts: 0 });
  const missing = buildPlan(base);

  assert.equal(zero.free, missing.free);
  assert.equal(bucketAmount(zero, 'save'), bucketAmount(missing, 'save'));
});


test('living costs above the income leave nothing rather than a negative', () => {
  const plan = buildPlan({ income: 40000, dependents: 2, hasLoan: true, emi: 9000, essentialCosts: 38000 });

  assert.equal(plan.free, 0);

  for (const bucket of plan.buckets) {
    assert.equal(bucket.amount, 0);
  }
});


test('an EMI larger than the income leaves nothing to plan with', () => {
  const plan = buildPlan({ income: 30000, dependents: 3, hasLoan: true, emi: 50000 });

  // Never a negative amount, and never a number that is not a number.
  assert.equal(plan.free, 0);

  for (const bucket of plan.buckets) {
    assert.equal(bucket.amount, 0);
    assert.ok(Number.isFinite(bucket.amount));
  }
});


test('bucketAmount copes with a missing plan or an unknown name', () => {
  const plan = buildPlan({ income: 80000, dependents: 1, hasLoan: false });

  assert.ok(bucketAmount(plan, 'save') > 0);

  // Both return 0 rather than throwing, because the pages call this while
  // they are still loading.
  assert.equal(bucketAmount(null, 'save'), 0);
  assert.equal(bucketAmount(plan, 'nonsense'), 0);
});


// ---------------------------------------------------------------
// Formatting money
// ---------------------------------------------------------------

test('formatRupees uses Indian grouping and shortens big numbers', () => {
  assert.equal(formatRupees(62000), '₹62,000');
  assert.equal(formatRupees(1234567), '₹12,34,567');
  assert.equal(formatRupees(1380000, { short: true }), '₹13.8 L');
  assert.equal(formatRupees(12345678, { short: true }), '₹1.23 Cr');
});


test('regression: a negative amount is shortened too', () => {
  /*
    The size test used to be "amount >= 100000", which is never true for a
    negative number, so every negative fell through to the long form. Net worth
    is often negative early on, and the dashboard prints it in a large display
    font sized for "₹8.5 L".
  */
  assert.equal(formatRupees(-850000, { short: true }), '-₹8.5 L');
  assert.equal(formatRupees(-12345678, { short: true }), '-₹1.23 Cr');

  // The minus goes before the symbol, which is the usual convention.
  assert.equal(formatRupees(-5000), '-₹5,000');
});


test('regression: formatRupees never prints NaN', () => {
  assert.equal(formatRupees(NaN), '₹—');
  assert.equal(formatRupees(Infinity), '₹—');
  assert.equal(formatRupees(undefined), '₹—');
});


// ---------------------------------------------------------------
// Goals
// ---------------------------------------------------------------

test('describeGoal splits what is left over the months remaining', () => {
  const oneYearOn = new Date();
  oneYearOn.setFullYear(oneYearOn.getFullYear() + 1);

  const detail = describeGoal({
    targetAmount: 120000,
    savedAmount: 0,
    targetDate: oneYearOn.toISOString().slice(0, 10),
  });

  assert.equal(detail.remaining, 120000);
  assert.ok(detail.months >= 11 && detail.months <= 12);
  assert.ok(detail.monthlyNeeded > 9000 && detail.monthlyNeeded <= 11000);
  assert.equal(detail.isComplete, false);
});


test('a goal with no time left asks for the whole remainder, not Infinity', () => {
  const detail = describeGoal({
    targetAmount: 100000,
    savedAmount: 20000,
    targetDate: '2020-01-01',
  });

  assert.equal(detail.months, 0);
  assert.equal(detail.isOverdue, true);

  // Dividing by zero months would print "₹Infinity" on the page.
  assert.equal(detail.monthlyNeeded, 80000);
  assert.ok(Number.isFinite(detail.monthlyNeeded));
});


test('a finished goal needs nothing more each month', () => {
  const detail = describeGoal({
    targetAmount: 50000,
    savedAmount: 50000,
    targetDate: '2030-01-01',
  });

  assert.equal(detail.isComplete, true);
  assert.equal(detail.monthlyNeeded, 0);
  assert.equal(detail.percentDone, 100);
});


test('monthsUntil survives a date it cannot read', () => {
  assert.equal(monthsUntil('not-a-date'), 0);
  assert.equal(monthsUntil(''), 0);
});


test('summariseGoals says plainly when the goals do not fit', () => {
  const soon = new Date();
  soon.setMonth(soon.getMonth() + 10);
  const date = soon.toISOString().slice(0, 10);

  const goals = [
    { targetAmount: 200000, savedAmount: 0, targetDate: date },
    { targetAmount: 200000, savedAmount: 0, targetDate: date },
  ];

  // Together they need about ₹40,000 a month, against a plan of ₹10,000.
  const summary = summariseGoals(goals, 10000);

  assert.equal(summary.isAffordable, false);
  assert.ok(summary.shortfall > 0);

  const roomy = summariseGoals(goals, 100000);
  assert.equal(roomy.isAffordable, true);
  assert.equal(roomy.shortfall, 0);
});


test('the emergency fund target rises with dependents and a variable income', () => {
  assert.equal(safetyNet(0, 40000, 0, false).monthsTarget, 3);
  assert.equal(safetyNet(0, 40000, 2, false).monthsTarget, 6);
  assert.equal(safetyNet(0, 40000, 0, true).monthsTarget, 6);
  assert.equal(safetyNet(0, 40000, 2, true).monthsTarget, 9);

  // A caller written before the question existed still gets its old answer.
  assert.equal(safetyNet(0, 40000, 2).monthsTarget, 6);
});


// ---------------------------------------------------------------
// Net worth
// ---------------------------------------------------------------

test('net worth is what you own minus what you owe, and can be negative', () => {
  const summary = summariseNetWorth(
    [{ value: 150000, kind: 'cash' }],
    [{ principal: 1000000 }],
  );

  assert.equal(summary.totalAssets, 150000);
  assert.equal(summary.totalDebts, 1000000);
  assert.equal(summary.netWorth, -850000);
});


test('only the assets you could actually reach count as liquid', () => {
  const summary = summariseNetWorth(
    [
      { value: 100000, kind: 'cash' },
      { value: 50000, kind: 'fd' },
      { value: 5000000, kind: 'property' },
      { value: 200000, kind: 'mutual_fund' },
    ],
    [],
  );

  // Selling a flat is not an emergency fund.
  assert.equal(summary.liquidAssets, 150000);
  assert.equal(summary.totalAssets, 5350000);
});


test('groupAssetsByKind leaves out the kinds with nothing in them', () => {
  const groups = groupAssetsByKind([
    { value: 1000, kind: 'cash' },
    { value: 2000, kind: 'cash' },
    { value: 500, kind: 'gold' },
  ]);

  assert.equal(groups.length, 2, 'no empty slivers in the bar');
  assert.equal(groups[0].total, 3000, 'the two cash rows are added together');
});


// ---------------------------------------------------------------
// Check-ins
// ---------------------------------------------------------------

function month(name, income, saved, invested) {
  return { id: name, month: name, income, spent: income - saved - invested, saved, invested, note: '' };
}


test('summariseCheckins gives nothing back when nothing is recorded', () => {
  // So the card can invite the first one instead of showing a row of zeros.
  assert.equal(summariseCheckins([], 30), null);
});


test('summariseCheckins averages what was kept and finds the best month', () => {
  const summary = summariseCheckins(
    [month('2026-08', 100000, 30000, 10000), month('2026-07', 100000, 10000, 10000)],
    30,
  );

  assert.equal(summary.count, 2);
  assert.equal(summary.averageKeptShare, 30);
  assert.equal(summary.bestMonth, '2026-08');
  assert.equal(summary.totalKept, 60000);
});


test('being slightly under the plan still counts as meeting it', () => {
  // Telling somebody on 29% against a plan of 30% that they have failed is how
  // you get them to stop opening the app.
  const close = summariseCheckins([month('2026-08', 100000, 29000, 0)], 30);
  assert.equal(close.isMeetingPlan, true);

  const wayOff = summariseCheckins([month('2026-08', 100000, 10000, 0)], 30);
  assert.equal(wayOff.isMeetingPlan, false);
});


test('a trend is only claimed once there are four months', () => {
  const three = summariseCheckins(
    [month('2026-08', 100000, 30000, 0), month('2026-07', 100000, 20000, 0), month('2026-06', 100000, 10000, 0)],
    30,
  );

  // Two or three months tell you almost nothing. One wedding and a straight
  // line looks like a collapse.
  assert.equal(three.trend, 'unknown');

  const four = summariseCheckins(
    [
      month('2026-08', 100000, 40000, 0), month('2026-07', 100000, 38000, 0),
      month('2026-06', 100000, 10000, 0), month('2026-05', 100000, 12000, 0),
    ],
    30,
  );

  assert.equal(four.trend, 'improving');
});


test('a trend can slip as well as improve, and can hold steady', () => {
  const rows = [
    month('2026-08', 100000, 10000, 0), month('2026-07', 100000, 12000, 0),
    month('2026-06', 100000, 38000, 0), month('2026-05', 100000, 40000, 0),
  ];

  assert.equal(summariseCheckins(rows, 30).trend, 'slipping');

  const flat = [
    month('2026-08', 100000, 30000, 0), month('2026-07', 100000, 30000, 0),
    month('2026-06', 100000, 30000, 0), month('2026-05', 100000, 30000, 0),
  ];

  assert.equal(summariseCheckins(flat, 30).trend, 'steady');
});


test('a month with no income does not divide by zero', () => {
  assert.equal(keptShareOf(month('2026-08', 0, 0, 0)), 0);

  const summary = summariseCheckins([month('2026-08', 0, 0, 0)], 30);
  assert.ok(Number.isFinite(summary.averageKeptShare));
});


test('hasCheckinFor and monthLabel agree on what a month is', () => {
  const rows = [month('2026-08', 100000, 10000, 0)];

  assert.equal(hasCheckinFor(rows, '2026-08'), true);
  assert.equal(hasCheckinFor(rows, '2026-09'), false);

  assert.equal(monthLabel('2026-08'), 'August 2026');

  // A single digit month keeps its leading zero, or nothing matches.
  assert.equal(monthLabel('2026-01'), 'January 2026');
});


test('the assumed market return is a sensible long-run figure', () => {
  // Used by both the projection and the debt-priority decision, so a slip here
  // would change advice as well as a chart.
  assert.ok(ASSUMED_YEARLY_RETURN > 0.05 && ASSUMED_YEARLY_RETURN < 0.2);
});
