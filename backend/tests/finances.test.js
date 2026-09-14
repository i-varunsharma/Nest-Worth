import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPlan, bucketAmount } from '../../shared/plan.js';
import { buildHouseholdPlan, monthlyCostsOf, summariseFinances } from '../../shared/finances.js';
import { checkFamilyMember, summariseFamily } from '../../shared/family.js';
import {
  CRISIS_SPEND_SHARE,
  normaliseShock,
  runShock,
  runStandardShocks,
  verdictSentence,
} from '../../shared/shocks.js';

/*
  Tests for shared/finances.js, shared/family.js and shared/shocks.js.
  Run with: npm test

  finances.js is the one place every page gets its numbers from, so most of
  these check that it agrees with itself and with the rules in plan.js.
*/

const household = {
  income: 90000,
  dependents: 2,
  incomeVaries: false,
  essentialCosts: 25000,
  chosenPlan: null,
};

const homeLoan = { id: 1, name: 'Home loan', kind: 'home', principal: 2500000, annualRate: 8.4, emi: 12000 };

const papa = { id: 1, name: 'Papa', relation: 'parent', monthlySupport: 8000, hasHealthCover: false };
const riya = { id: 2, name: 'Riya', relation: 'sibling', monthlySupport: 5000, hasHealthCover: true };

const savings = { name: 'Savings', kind: 'cash', value: 150000 };


function financesFor(overrides) {
  return summariseFinances({
    household: household,
    debts: [homeLoan],
    assets: [savings],
    family: [papa, riya],
    ...overrides,
  });
}


// ---------------------------------------------------------------
// One plan for every page
// ---------------------------------------------------------------

test('regression: the plan knows the debt rate, so a cheap loan does not cut investing', () => {
  /*
    The goals and check-in pages used to build the plan without the debt's
    rate. buildPlan then assumed the expensive case and moved 7% from investing
    to saving, so those pages showed a different saving from the dashboard.
  */
  const withRate = buildHouseholdPlan(household, [homeLoan], []);

  const withoutRate = buildPlan({
    income: household.income,
    dependents: household.dependents,
    hasLoan: true,
    essentialCosts: household.essentialCosts,
    emi: homeLoan.emi,
  });

  assert.ok(
    bucketAmount(withRate, 'invest') > bucketAmount(withoutRate, 'invest'),
    'a home loan at 8.4% should not reduce investing',
  );
});


test('regression: one month of costs includes rent and bills', () => {
  // The safety net used to leave these out and looked months longer than it was.
  const plan = buildHouseholdPlan(household, [homeLoan], []);

  const expected = plan.essentialCosts + plan.support + plan.emi + bucketAmount(plan, 'spend');

  assert.equal(monthlyCostsOf(plan), expected);
  assert.ok(monthlyCostsOf(plan) > plan.essentialCosts, 'rent alone cannot be the whole month');
});


test('the safety net is measured against the full month of costs', () => {
  const finances = financesFor();

  assert.equal(finances.safety.monthsCovered, savings.value / finances.monthlyCosts);
});


test('with nobody chosen, the plan shown is the recommended one', () => {
  const finances = financesFor();

  assert.equal(finances.followedScenario, null);
  assert.deepEqual(finances.plan, finances.recommendedPlan);
});


test('a chosen plan changes what is shown and leaves the recommendation alone', () => {
  const finances = financesFor({
    household: { ...household, chosenPlan: 'invest' },
  });

  assert.equal(finances.followedScenario.key, 'invest');
  assert.equal(bucketAmount(finances.plan, 'invest'), finances.followedScenario.allocation.invest);
  assert.notEqual(bucketAmount(finances.plan, 'invest'), bucketAmount(finances.recommendedPlan, 'invest'));
});


test('a chosen plan that no longer applies falls back to the recommendation', () => {
  // "debt" is only offered to somebody with a debt. After the debt is deleted
  // the stored choice points at nothing, and the page must not break.
  const finances = financesFor({
    household: { ...household, chosenPlan: 'debt' },
    debts: [],
  });

  assert.equal(finances.followedScenario, null);
  assert.deepEqual(finances.plan, finances.recommendedPlan);
});


// ---------------------------------------------------------------
// Family
// ---------------------------------------------------------------

test('listed family replaces the estimate with the real amounts', () => {
  const finances = financesFor();

  assert.equal(finances.plan.support, papa.monthlySupport + riya.monthlySupport);
  assert.equal(finances.dependents, 2);
});


test('with nobody listed, the onboarding estimate is still used', () => {
  // Existing accounts have no family rows, and their plan must not change.
  const withoutFamily = buildHouseholdPlan(household, [homeLoan], []);

  const asBefore = buildPlan({
    income: household.income,
    dependents: household.dependents,
    hasLoan: true,
    essentialCosts: household.essentialCosts,
    emi: homeLoan.emi,
    topRate: homeLoan.annualRate,
    topDebtName: 'home loan',
  });

  assert.equal(withoutFamily.support, asBefore.support);
  assert.ok(withoutFamily.support > 0, 'two dependents should have an estimated cost');
});


test('family listed with no monthly support means zero, not the estimate', () => {
  const finances = financesFor({
    family: [{ ...papa, monthlySupport: 0 }],
  });

  assert.equal(finances.plan.support, 0);
  assert.equal(finances.dependents, 1);
});


test('the family summary adds up support and finds who has no cover', () => {
  const summary = summariseFamily([papa, riya]);

  assert.equal(summary.totalSupport, 13000);
  assert.equal(summary.count, 2);
  assert.equal(summary.withoutCover.length, 1);
  assert.equal(summary.withoutCover[0].name, 'Papa');
});


test('a family member needs a name, a known relation and a real amount', () => {
  const good = { name: 'Maa', relation: 'parent', monthlySupport: 6000, hasHealthCover: true };

  assert.equal(checkFamilyMember(good), '');
  assert.notEqual(checkFamilyMember({ ...good, name: '  ' }), '');
  assert.notEqual(checkFamilyMember({ ...good, relation: 'boss' }), '');
  assert.notEqual(checkFamilyMember({ ...good, monthlySupport: -1 }), '');
  assert.notEqual(checkFamilyMember({ ...good, monthlySupport: 'lots' }), '');
});


test('health cover has to be a real true or false', () => {
  const member = { name: 'Maa', relation: 'parent', monthlySupport: 6000, hasHealthCover: 'false' };

  assert.notEqual(checkFamilyMember(member), '');
});


// ---------------------------------------------------------------
// The stress test
// ---------------------------------------------------------------

test('after a shock ends, each month adds the plan\'s saving back', () => {
  // A conservation check. Outside a crisis the walk must match the plan exactly,
  // or the stress test and the dashboard disagree about a normal month.
  const finances = financesFor();
  const result = runShock({ finances: finances, family: [papa, riya], shock: { type: 'job_loss', months: 2 } });

  const save = bucketAmount(finances.plan, 'save');

  for (let month = 4; month <= 12; month = month + 1) {
    const change = result.rows[month].cash - result.rows[month - 1].cash;

    // Rounding each row to whole rupees can leave the difference a rupee out.
    assert.ok(Math.abs(change - save) <= 2, 'month ' + month + ' changed by ' + change);
  }
});


test('a crisis month halves everyday spending and pauses investing', () => {
  const finances = financesFor();
  const plan = finances.plan;

  const result = runShock({ finances: finances, family: [], shock: { type: 'job_loss', months: 1 } });

  const expected = 0 - plan.essentialCosts - plan.support - finances.recommendedPlan.emi
    - bucketAmount(plan, 'spend') * CRISIS_SPEND_SHARE;

  const change = result.rows[1].cash - result.rows[0].cash;

  assert.ok(Math.abs(change - expected) <= 1);
  assert.equal(result.rows[1].isCrisis, true);
  assert.equal(result.rows[2].isCrisis, false);
});


test('no savings and no income breaks in the first month', () => {
  const finances = financesFor({ assets: [] });
  const result = runShock({ finances: finances, family: [], shock: { type: 'job_loss', months: 4 } });

  assert.equal(result.verdict, 'breaks');
  assert.equal(result.runsOutMonth, 1);
  assert.ok(result.shortfall > 0);
});


test('a large cash buffer survives the same shock safely', () => {
  const finances = financesFor({ assets: [{ name: 'FD', kind: 'fd', value: 5000000 }] });
  const result = runShock({ finances: finances, family: [], shock: { type: 'job_loss', months: 4 } });

  assert.equal(result.verdict, 'safe');
  assert.equal(result.runsOutMonth, null);
  assert.equal(result.shortfall, 0);
});


test('regression: the shortfall it reports is really enough', () => {
  /*
    The number the page tells somebody to put by has to work. Adding exactly
    that much cash and running the shock again must not break.

    It used to be rounded to the nearest 500, which could round down: a lowest
    point of -1,40,600 was reported as needing 1,40,500. Many savings levels are
    tried so a rounding case like that is always hit.
  */
  const shock = { type: 'job_loss', months: 5 };

  for (let savings = 0; savings <= 200000; savings = savings + 7300) {
    const finances = financesFor({ assets: [{ name: 'Savings', kind: 'cash', value: savings }] });
    const before = runShock({ finances: finances, family: [], shock: shock });

    if (before.verdict !== 'breaks') {
      continue;
    }

    const topped = financesFor({
      assets: [{ name: 'Savings', kind: 'cash', value: savings + before.shortfall }],
    });

    const after = runShock({ finances: topped, family: [], shock: shock });

    assert.notEqual(after.verdict, 'breaks', 'with ' + savings + ' saved, the shortfall was not enough');
  }
});


test('a smaller income cut does less damage than losing the income', () => {
  const finances = financesFor();

  const cut = runShock({ finances: finances, family: [], shock: { type: 'income_cut', percent: 30, months: 4 } });
  const loss = runShock({ finances: finances, family: [], shock: { type: 'job_loss', months: 4 } });

  assert.ok(cut.lowestCash > loss.lowestCash);
});


test('a hospital bill lands on the first person without cover', () => {
  const finances = financesFor();
  const result = runShock({ finances: finances, family: [riya, papa], shock: { type: 'medical', amount: 300000 } });

  assert.equal(result.outOfPocket, 300000);
  assert.ok(result.description.includes('Papa'));
});


test('with everyone covered, only the out of pocket share is paid', () => {
  const finances = financesFor();
  const covered = [{ ...papa, hasHealthCover: true }];

  const result = runShock({ finances: finances, family: covered, shock: { type: 'medical', amount: 300000 } });

  assert.equal(result.outOfPocket, 60000);
});


test('shock settings outside the limits are pulled back in', () => {
  assert.deepEqual(normaliseShock({ type: 'job_loss', months: 40 }), { type: 'job_loss', months: 12 });
  assert.deepEqual(normaliseShock({ type: 'job_loss', months: 'soon' }), { type: 'job_loss', months: 1 });
  assert.equal(normaliseShock({ type: 'alien_invasion' }), null);
  assert.equal(normaliseShock(null), null);
});


test('an unknown shock gives null rather than a made up result', () => {
  const result = runShock({ finances: financesFor(), family: [], shock: { type: 'meteor' } });

  assert.equal(result, null);
});


test('the standard shocks count survivals from their own verdicts', () => {
  const summary = runStandardShocks({ finances: financesFor(), family: [papa, riya] });

  let survived = 0;
  summary.results.forEach((result) => {
    if (result.verdict !== 'breaks') {
      survived = survived + 1;
    }
  });

  assert.equal(summary.total, 4);
  assert.equal(summary.survivedCount, survived);
});


test('every verdict has a sentence to go with it', () => {
  const finances = financesFor({ assets: [] });
  const result = runShock({ finances: finances, family: [], shock: { type: 'job_loss', months: 3 } });

  const sentence = verdictSentence(result);

  assert.ok(sentence.includes('month 1'));
  assert.ok(sentence.includes('₹'));
});
