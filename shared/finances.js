import { buildPlan, bucketAmount } from './plan.js';
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
  Builds the recommended plan from stored data.

    household  { income, dependents, incomeVaries, essentialCosts }
    debts      [{ name, annualRate, emi, ... }]
    family     [{ monthlySupport, ... }], can be empty

  Once any family member is listed, the real people replace the onboarding
  guess: the count becomes the number of dependents and their total support
  replaces the 12% per person estimate.
*/
export function buildHouseholdPlan(household, debts, family) {
  const familySummary = summariseFamily(family);

  let totalEmi = 0;
  debts.forEach((debt) => {
    totalEmi = totalEmi + debt.emi;
  });

  const worstDebt = orderByRate(debts)[0];

  const input = {
    income: household.income,
    dependents: household.dependents,
    hasLoan: debts.length > 0,
    incomeVaries: household.incomeVaries === true,
    essentialCosts: household.essentialCosts,
    emi: totalEmi,
  };

  if (worstDebt) {
    input.topRate = worstDebt.annualRate;
    input.topDebtName = worstDebt.name.toLowerCase();
  }

  if (familySummary.hasList === true) {
    input.dependents = familySummary.count;
    input.supportCosts = familySummary.totalSupport;
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

  let dependents = household.dependents;
  if (familySummary.hasList === true) {
    dependents = familySummary.count;
  }

  const recommendedPlan = buildHouseholdPlan(household, debts, family);

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
