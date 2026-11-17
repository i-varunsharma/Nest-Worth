import { buildPlan, bucketAmount, DEFAULT_SUPPORT_PER_PERSON, putSafetyFirst, SAFETY_FIRST_MONTHS } from './plan.js';
import { orderByRate, summariseDebts } from './debt.js';
import { safetyNet } from './goals.js';
import { summariseNetWorth } from './networth.js';
import { summariseFamily } from './family.js';
import { applyChosenPlan, buildScenarios } from './scenarios.js';

/*
  One person's whole financial picture, worked out in one place.

  Before this file, the dashboard, the goals page, the check-in page, the
  scenarios route and the AI tools each built the plan themselves, and they had
  drifted apart. The goals page left out the debt's interest rate, so it could
  show a different monthly saving from the dashboard for the same person.

  Now every one of them calls summariseFinances. If a number on screen looks
  wrong, this is the file to start from.

  Pure maths: no database, no fetch, no React. The browser and the server both
  run it, which is why it lives in shared/.
*/


/*
  How many of the people counted in onboarding are not on the Family page yet.

  Somebody who said 2 and then listed only Papa still supports 2 people. The
  missing one keeps the estimate until they are listed, or until the count is
  changed in onboarding. Dropping them quietly made the plan look richer than it was.
*/
export function peopleNotListed(household, familySummary) {
  const missing = household.dependents - familySummary.count;

  if (missing > 0) {
    return missing;
  }

  return 0;
}


/*
  True when onboarding said a loan is running but no debt has been added yet.
  The plan then uses the default EMI, and the dashboard asks for the real one.
*/
export function isLoanDetailsMissing(household, debts) {
  return household.hasLoan === true && debts.length === 0;
}


/*
  Builds the recommended plan from stored data.

    household  { income, dependents, hasLoan, incomeVaries, essentialCosts }
    debts      [{ name, annualRate, emi, ... }]
    family     [{ monthlySupport, ... }], can be empty

  Listed family members replace the onboarding guess with their real support.
  Anyone counted in onboarding but not listed yet keeps the per person estimate.
*/
export function buildHouseholdPlan(household, debts, family) {
  const familySummary = summariseFamily(family);

  let totalEmi = 0;
  debts.forEach((debt) => {
    totalEmi = totalEmi + debt.emi;
  });

  const worstDebt = orderByRate(debts)[0];

  // A loan answered "yes" in onboarding counts even before its details are
  // added. Before this, the answer was thrown away and the dashboard said
  // "no loan running" to somebody who had just said they were paying one.
  let hasLoan = debts.length > 0;
  if (isLoanDetailsMissing(household, debts) === true) {
    hasLoan = true;
  }

  const input = {
    income: household.income,
    dependents: household.dependents,
    hasLoan: hasLoan,
    incomeVaries: household.incomeVaries === true,
    essentialCosts: household.essentialCosts,
    emi: totalEmi,
  };

  if (worstDebt) {
    input.topRate = worstDebt.annualRate;
    // Kept as typed, so "HDFC education loan" does not become "hdfc".
    input.topDebtName = worstDebt.name;
  }

  if (familySummary.hasList === true) {
    const notListed = peopleNotListed(household, familySummary);

    input.dependents = familySummary.count + notListed;
    input.supportCosts = familySummary.totalSupport + notListed * DEFAULT_SUPPORT_PER_PERSON;
  }

  // Only the AI's "what if" tool sets this. Nothing stored has it.
  if (Number.isFinite(household.extraSupport)) {
    input.extraSupport = household.extraSupport;
  }

  return buildPlan(input);
}


/*
  What one month costs if nothing optional is cut.

  Rent and bills, family support, EMIs and everyday spending. The old version
  of this sum left out rent and bills, so the safety net looked longer than it
  really was. There is a regression test for that in finances.test.js.
*/
export function monthlyCostsOf(plan) {
  return plan.essentialCosts + plan.support + plan.emi + bucketAmount(plan, 'spend');
}


/*
  Everything the app shows about one person's money.

    household  as stored, including chosenPlan (a scenario key or null)
    debts      the debts list
    assets     the assets list
    family     the family list

  Returns:
    incomeVaries      true for freelance or commission income
    dependents        how many people the salary supports
    peopleNotListed   counted in onboarding but not on the Family page yet
    loanDetailsMissing  a loan was answered "yes" but no debt is added
    isSafetyFirst     true while the investing money is held as cash instead
    family            summariseFamily's result
    debtSummary       totals and the debt free date
    netWorth          owned, owed, and the part that is cash
    recommendedPlan   the split the model suggests
    scenarios         every plan, played out fifteen years
    followedScenario  the one they chose on /plans, or null
    plan              the plan to show: the chosen one if any, else recommended
    monthlyCosts      what one month costs
    safety            months of cover against the target
*/
export function summariseFinances(input) {
  const household = input.household;
  const debts = input.debts;
  const assets = input.assets;
  const family = input.family;

  const familySummary = summariseFamily(family);
  const debtSummary = summariseDebts(debts);
  const netWorth = summariseNetWorth(assets, debts);

  // Same count the plan uses: listed people plus anyone not listed yet.
  let dependents = household.dependents;
  let notListed = 0;
  if (familySummary.hasList === true) {
    notListed = peopleNotListed(household, familySummary);
    dependents = familySummary.count + notListed;
  }

  let recommendedPlan = buildHouseholdPlan(household, debts, family);

  // Costs come from the recommended plan, not the chosen one. Scenarios need
  // this number before any choice is applied, and one definition keeps every
  // page agreeing on how long the savings last.
  const monthlyCosts = monthlyCostsOf(recommendedPlan);

  const safety = safetyNet(
    netWorth.liquidAssets,
    monthlyCosts,
    dependents,
    household.incomeVaries === true,
  );

  // With less than SAFETY_FIRST_MONTHS of cash, the investing money is held as
  // cash instead. Moving it from Invest to Save leaves Spend alone, so
  // monthlyCosts above is still right.
  let isSafetyFirst = false;

  if (safety.monthsCovered < SAFETY_FIRST_MONTHS) {
    const saferPlan = putSafetyFirst(recommendedPlan, netWorth.liquidAssets, monthlyCosts);

    // putSafetyFirst hands back the same plan when there was nothing to move.
    if (saferPlan !== recommendedPlan) {
      isSafetyFirst = true;
      recommendedPlan = saferPlan;
    }
  }

  const scenarios = buildScenarios({
    basePlan: recommendedPlan,
    debts: debts,
    liquidSavings: netWorth.liquidAssets,
    monthsTarget: safety.monthsTarget,
    monthlyCosts: monthlyCosts,
  });

  let followedScenario = null;

  scenarios.forEach((scenario) => {
    if (scenario.key === household.chosenPlan) {
      followedScenario = scenario;
    }
  });

  let plan = recommendedPlan;

  if (followedScenario !== null) {
    plan = applyChosenPlan(recommendedPlan, followedScenario);
  }

  return {
    incomeVaries: household.incomeVaries === true,
    dependents: dependents,
    peopleNotListed: notListed,
    loanDetailsMissing: isLoanDetailsMissing(household, debts),
    isSafetyFirst: isSafetyFirst,
    family: familySummary,
    debtSummary: debtSummary,
    netWorth: netWorth,
    recommendedPlan: recommendedPlan,
    scenarios: scenarios,
    followedScenario: followedScenario,
    plan: plan,
    monthlyCosts: monthlyCosts,
    safety: safety,
  };
}
