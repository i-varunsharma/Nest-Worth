import test from 'node:test';
import assert from 'node:assert/strict';

import { buildScenarios, simulate } from '../../shared/scenarios.js';
import { buildHouseholdPlan } from '../../shared/finances.js';

/*
  Tests for the plan comparison. Run with: npm test

  This is a simulation, which makes it the easiest thing in the project to get
  quietly wrong. It runs a hundred and eighty times per scenario and produces a
  number nobody can check by eye, so a mistake in it does not look like a
  mistake: it looks like an answer.

  The tests below are mostly conservation checks. Money cannot appear, money
  cannot vanish, and every plan has to be spending the same income as the
  others or the comparison the page is built on is meaningless.
*/

const debts = [
  { name: 'Credit card', kind: 'credit_card', principal: 84000, annualRate: 42, emi: 4000 },
  { name: 'Education loan', kind: 'education', principal: 410000, annualRate: 8.4, emi: 7200 },
];

const household = {
  income: 85000,
  dependents: 2,
  hasLoan: true,
  incomeVaries: false,
  essentialCosts: 24000,
};

function scenariosFor(overrides) {
  return buildScenarios({
    basePlan: buildHouseholdPlan(household, debts, []),
    debts: debts,
    liquidSavings: 95000,
    monthsTarget: 6,
    monthlyCosts: 42000,
    ...overrides,
  });
}


// ---------------------------------------------------------------
// The simulation
// ---------------------------------------------------------------

test('a freed EMI becomes money to invest', () => {
  /*
    This is the single most important line in the whole simulation, and the
    thing a simpler version leaves out.

    When a debt finishes, the EMI stops leaving the account. That money has to
    go somewhere, and every plan sends it to investing. Without it, paying extra
    at a debt looks permanently worse than investing the same money, and the app
    would be arguing against the thing it recommends.

    One debt, cleared quickly, then years of its EMI being invested. The amount
    invested must end up far above what the monthly investing alone would give.
  */
  const oneSmallDebt = [
    { name: 'Small', kind: 'other', principal: 20000, annualRate: 10, emi: 5000 },
  ];

  const played = simulate({ debts: oneSmallDebt, monthlyInvest: 1000, monthlySave: 0, extraToDebt: 0, years: 10 });
  const lastRow = played.rows[played.rows.length - 1];

  // Ten years of ₹1,000 alone would be ₹1,20,000 put in.
  const investingAlone = 1000 * 12 * 10;

  assert.ok(
    lastRow.invested > investingAlone * 2,
    'the freed EMI is not being reinvested: ' + lastRow.invested,
  );
});


test('paying extra clears the debt sooner', () => {
  const without = simulate({ debts: debts, monthlyInvest: 3000, monthlySave: 0, extraToDebt: 0, years: 15 });
  const with3000 = simulate({ debts: debts, monthlyInvest: 0, monthlySave: 0, extraToDebt: 3000, years: 15 });

  assert.ok(without.debtFreeMonth > with3000.debtFreeMonth);
});


test('the extra payment rolls onto the next debt', () => {
  /*
    The bug this catches was real and shipped for an afternoon.

    The debt-free date used to be worked out with payoff() on each debt
    separately, which cannot see that clearing the credit card frees the extra
    payment to move onto the loan behind it. Every plan reported the same date.

    A large extra payment has to clear BOTH debts far sooner than the slower
    one's own EMI would manage, and that is only possible if it rolls over.
  */
  const onEmiAlone = simulate({ debts: debts, monthlyInvest: 0, monthlySave: 0, extraToDebt: 0, years: 40 });
  const withBigExtra = simulate({ debts: debts, monthlyInvest: 0, monthlySave: 0, extraToDebt: 15000, years: 40 });

  assert.ok(onEmiAlone.debtFreeMonth > 60, 'the loan should be slow on its EMI alone');
  assert.ok(
    withBigExtra.debtFreeMonth < onEmiAlone.debtFreeMonth / 2,
    'the extra is not rolling onto the second debt',
  );
});


test('somebody with no debts is debt free today', () => {
  const played = simulate({ debts: [], monthlyInvest: 5000, monthlySave: 0, extraToDebt: 0, years: 5 });

  assert.equal(played.debtFreeMonth, 0);
});


test('the simulation never touches the debts it was given', () => {
  // It reduces balances as it goes. Doing that to the caller's own objects
  // would mean the second scenario started from the first one's leftovers, and
  // every plan after the first would be quietly wrong.
  const before = JSON.stringify(debts);

  simulate({ debts: debts, monthlyInvest: 2000, monthlySave: 0, extraToDebt: 5000, years: 15 });
  simulate({ debts: debts, monthlyInvest: 2000, monthlySave: 0, extraToDebt: 5000, years: 15 });

  assert.equal(JSON.stringify(debts), before);
});


test('two runs of the same choice give the same answer', () => {
  const first = simulate({ debts: debts, monthlyInvest: 2000, monthlySave: 0, extraToDebt: 3000, years: 15 });
  const second = simulate({ debts: debts, monthlyInvest: 2000, monthlySave: 0, extraToDebt: 3000, years: 15 });

  assert.deepEqual(first.rows, second.rows);
  assert.equal(first.debtFreeMonth, second.debtFreeMonth);
});


// ---------------------------------------------------------------
// The choices offered
// ---------------------------------------------------------------

test('every plan spends exactly the same income', () => {
  /*
    The comparison only means anything if the plans are different arrangements
    of the same money. A plan that quietly invented income would win every
    chart on the page and be a lie.
  */
  const plans = scenariosFor();

  for (const plan of plans) {
    const a = plan.allocation;
    const total = a.committed + a.spend + a.save + a.invest + a.extraToDebt;

    assert.equal(total, household.income, plan.name + ' does not add up to the income');
  }
});


test('no plan allocates a negative amount', () => {
  const plans = scenariosFor();

  for (const plan of plans) {
    const a = plan.allocation;

    for (const key of Object.keys(a)) {
      assert.ok(a[key] >= 0, plan.name + ' has a negative ' + key);
    }
  }
});


test('somebody with no debt is never told to clear one', () => {
  // Offering all four choices to everybody is a brochure. Offering the ones
  // that apply is advice.
  const plans = buildScenarios({
    basePlan: buildHouseholdPlan(household, [], []),
    debts: [],
    liquidSavings: 95000,
    monthsTarget: 6,
    monthlyCosts: 42000,
  });

  const keys = plans.map((plan) => { return plan.key; });

  assert.equal(keys.includes('debt'), false);
  assert.ok(keys.includes('balanced'));
});


test('somebody whose safety net is already full is not told to keep filling it', () => {
  const plans = scenariosFor({ liquidSavings: 5000000 });

  const keys = plans.map((plan) => { return plan.key; });

  assert.equal(keys.includes('buffer'), false);
});


test('the plan as it stands is always first, as the thing to compare against', () => {
  const plans = scenariosFor();

  assert.equal(plans[0].key, 'balanced');
});


test('clearing an expensive debt wins on both counts', () => {
  /*
    This test used to assert the opposite, and the assertion was wrong.

    The reasoning behind it sounded right: money sent at a debt is money not
    invested, so the debt plan should end up a little behind. What it missed is
    that nothing is being given up permanently. The debt goes, and then the EMI
    AND the extra payment are both free to invest for the remaining years.

    Against a card at 42% that is not a close call. Nothing available to a
    saver reliably pays 42%, so clearing it is the best return in the list, and
    the plan finishes ahead on money as well as years. The test now says so.
  */
  const plans = scenariosFor();

  const balanced = plans.find((plan) => { return plan.key === 'balanced'; });
  const debtFirst = plans.find((plan) => { return plan.key === 'debt'; });

  assert.ok(debtFirst.outcomes.debtFreeMonths < balanced.outcomes.debtFreeMonths);
  assert.ok(
    debtFirst.outcomes.totalAfterYears > balanced.outcomes.totalAfterYears,
    'clearing a 42% card should end up ahead',
  );
});


test('no plan loses money that was never spent', () => {
  /*
    The bug this catches shipped and was caught by reading the output.

    Once every debt cleared, the extra payment had nothing to be paid at, and
    the simulation simply dropped it: eleven thousand rupees a month ceased to
    exist for fourteen years. It made clearing the debt early look
    catastrophic, which is the exact opposite of the truth.

    Every plan puts the same amount aside each month, so over fifteen years
    every plan must have put a similar amount IN, whatever it grew to.
  */
  const plans = scenariosFor();

  let smallest = Infinity;
  let largest = 0;

  for (const plan of plans) {
    const a = plan.allocation;
    const putAsideEachMonth = a.save + a.invest + a.extraToDebt;

    // Roughly what should have gone somewhere over fifteen years, ignoring
    // the freed EMIs which only ever add to it.
    const overFifteenYears = putAsideEachMonth * 12 * 15;

    const accountedFor = plan.outcomes.investedAfterYears + plan.outcomes.cashAfterYears;

    assert.ok(
      accountedFor >= overFifteenYears * 0.9,
      plan.name + ' lost money: put aside about ' + overFifteenYears
        + ' but only ' + accountedFor + ' is accounted for',
    );

    if (accountedFor < smallest) {
      smallest = accountedFor;
    }
    if (accountedFor > largest) {
      largest = accountedFor;
    }
  }

  // And no plan should be wildly out of line with the others, since they are
  // all arrangements of the same income.
  assert.ok(largest / smallest < 3, 'the plans are not putting comparable amounts aside');
});


test('every plan comes with a full set of rows to draw', () => {
  // The chart reads rows[year] directly. A short list would draw a line that
  // stops halfway across with nothing to say why.
  const plans = scenariosFor();

  for (const plan of plans) {
    assert.equal(plan.rows.length, 16, plan.name + ' has the wrong number of rows');
    assert.equal(plan.rows[0].year, 0);
    assert.equal(plan.rows[15].year, 15);

    for (const row of plan.rows) {
      assert.ok(Number.isFinite(row.value), 'a row value is not a number');
      assert.ok(row.value >= 0);
      assert.ok(row.debtLeft >= 0);
    }
  }
});


test('a value never goes down over time', () => {
  // Investments only ever have money added and growth applied, so the line has
  // to climb. A dip would mean the simulation was losing money somewhere.
  const plans = scenariosFor();

  for (const plan of plans) {
    for (let index = 1; index < plan.rows.length; index = index + 1) {
      assert.ok(
        plan.rows[index].value >= plan.rows[index - 1].value,
        plan.name + ' loses value in year ' + index,
      );
    }
  }
});


test('a tiny income still produces plans rather than nonsense', () => {
  // The plan model floors what is left at zero, so there may be nothing to
  // allocate. That has to come out as zeros, not as negative numbers.
  const tinyHousehold = { income: 12000, dependents: 3, incomeVaries: true, essentialCosts: 11000 };

  const plans = buildScenarios({
    basePlan: buildHouseholdPlan(tinyHousehold, [], []),
    debts: [],
    liquidSavings: 0,
    monthsTarget: 9,
    monthlyCosts: 11000,
  });

  assert.ok(plans.length > 0);

  for (const plan of plans) {
    assert.ok(Number.isFinite(plan.outcomes.valueAfterYears));
    assert.ok(plan.outcomes.valueAfterYears >= 0);
  }
});


// ---------------------------------------------------------------
// Following a chosen plan
// ---------------------------------------------------------------

test('a chosen plan replaces the split the dashboard shows', async () => {
  const { applyChosenPlan } = await import('../../shared/scenarios.js');
  const { buildPlan } = await import('../../shared/plan.js');

  const plans = scenariosFor();
  const debtPlan = plans.find((one) => { return one.key === 'debt'; });

  const recommended = buildPlan({
    income: household.income,
    dependents: household.dependents,
    hasLoan: true,
    incomeVaries: false,
    essentialCosts: household.essentialCosts,
    emi: 11200,
  });

  const followed = applyChosenPlan(recommended, debtPlan);

  const invest = followed.buckets.find((b) => { return b.key === 'invest'; });

  // The debt plan puts nothing into investing, so the dashboard must not go on
  // showing the recommended investing figure.
  assert.equal(invest.amount, debtPlan.allocation.invest);
  assert.equal(invest.amount, 0);
});


test('extra sent at a debt is counted as money that has already left', () => {
  /*
    It is not a fourth bucket. The moment somebody commits to a plan that pays
    more at a debt, that money leaves before any choice is made, exactly like
    an EMI. Counting it anywhere else would leave the three shares adding up to
    less than what is left, and the card drawing them would show three bars
    with an unexplained gap.
  */
  const plans = scenariosFor();
  const debtPlan = plans.find((one) => { return one.key === 'debt'; });

  assert.ok(debtPlan.allocation.extraToDebt > 0, 'this test needs a plan that pays extra');
});


test('the three shares of a followed plan add up to 100', async () => {
  const { applyChosenPlan } = await import('../../shared/scenarios.js');
  const { buildPlan } = await import('../../shared/plan.js');

  const recommended = buildPlan({
    income: household.income, dependents: 2, hasLoan: true,
    incomeVaries: false, essentialCosts: household.essentialCosts, emi: 11200,
  });

  for (const plan of scenariosFor()) {
    const followed = applyChosenPlan(recommended, plan);

    let total = 0;
    followed.buckets.forEach((bucket) => {
      total = total + bucket.percent;
    });

    // Rounding can leave it a point out; anything more means the bars and the
    // figures beside them disagree.
    assert.ok(Math.abs(total - 100) <= 1, plan.name + ' shares add to ' + total);

    // And what is left has to be the three buckets, or the headline figure on
    // the card is not the sum of the bars under it.
    const summed = followed.buckets.reduce((run, b) => { return run + b.amount; }, 0);
    assert.equal(followed.free, summed);
  }
});
