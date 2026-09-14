/*
  Checks the onboarding answers. Returns an error message, or an empty string.

  Numbers can arrive as text over the network, so each is converted first and
  then checked to really be a number.
*/

const MIN_INCOME = 1000;
const MAX_INCOME = 100000000;
const MAX_DEPENDENTS = 20;

export const KNOWN_PLANS = ['balanced', 'debt', 'buffer', 'invest'];


export function checkHousehold(body) {
  const income = Number(body.income);
  const dependents = Number(body.dependents);

  if (!Number.isFinite(income) || income < MIN_INCOME || income > MAX_INCOME) {
    return 'That income does not look right.';
  }
  if (!Number.isInteger(dependents) || dependents < 0 || dependents > MAX_DEPENDENTS) {
    return 'That number of dependents does not look right.';
  }
  if (typeof body.hasLoan !== 'boolean') {
    return 'The loan answer is missing.';
  }

  // Optional, because it was added after people were using the app. When it is
  // sent it must be a real boolean, so the string "false" is not read as true.
  if (body.incomeVaries !== undefined && typeof body.incomeVaries !== 'boolean') {
    return 'The varying income answer is not in the right form.';
  }

  // Optional for the same reason. Missing means not answered.
  if (body.essentialCosts !== undefined) {
    const essentialCosts = Number(body.essentialCosts);

    if (!Number.isFinite(essentialCosts) || essentialCosts < 0) {
      return 'Those living costs do not look right.';
    }
    if (essentialCosts >= income) {
      return 'Your living costs cannot be more than your income.';
    }
  }

  return '';
}


/* The values to store, from a body that has passed checkHousehold. */
export function householdValues(body) {
  let essentialCosts = 0;
  if (body.essentialCosts !== undefined) {
    essentialCosts = Math.round(Number(body.essentialCosts));
  }

  return {
    income: Math.round(Number(body.income)),
    dependents: Number(body.dependents),
    hasLoan: body.hasLoan === true,
    incomeVaries: body.incomeVaries === true,
    essentialCosts: essentialCosts,
  };
}


/* null means "go back to the recommended plan". */
export function checkPlanChoice(plan) {
  if (plan !== null && KNOWN_PLANS.includes(plan) === false) {
    return 'That is not one of the plans.';
  }
  return '';
}
