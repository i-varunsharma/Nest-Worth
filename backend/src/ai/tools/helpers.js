import { readSnapshot } from '../../services/financeService.js';
import { summariseFinances } from '../../../../shared/finances.js';

// Small helpers shared by more than one tool.


// Returned by every tool that needs a plan, for somebody who skipped onboarding.
export const NO_HOUSEHOLD = 'This person has not answered the household questions yet, so there is no '
  + 'plan to work from. Suggest they finish setting up first.';


/*
  Finds the debt the model named. Models pass "credit card" rather than the exact
  stored name, so this tries an exact match first, then a partial one. Returns
  null rather than guessing.
*/
export function findDebtByName(debts, wanted) {
  if (typeof wanted !== 'string' || wanted.trim().length === 0) {
    return null;
  }

  const search = wanted.trim().toLowerCase();

  for (const debt of debts) {
    if (debt.name.toLowerCase() === search) {
      return debt;
    }
  }

  for (const debt of debts) {
    const name = debt.name.toLowerCase();

    if (name.includes(search) || search.includes(name)) {
      return debt;
    }
  }

  return null;
}


/* Finances with part of the household changed, for "what if" questions. Nothing is saved. */
export function whatIfFinances(userId, changes) {
  const snapshot = readSnapshot(userId);

  if (snapshot.household === null) {
    return null;
  }

  // A copy, so the real household stays as it was.
  const household = { ...snapshot.household };

  if (Number.isFinite(changes.income) && changes.income > 0) {
    household.income = changes.income;
  }

  if (Number.isFinite(changes.essentialCosts) && changes.essentialCosts >= 0) {
    household.essentialCosts = changes.essentialCosts;
  }

  if (Number.isFinite(changes.dependents) && changes.dependents >= 0) {
    household.dependents = changes.dependents;
  }

  if (Number.isFinite(changes.extraSupport) && changes.extraSupport > 0) {
    household.extraSupport = changes.extraSupport;
  }

  return summariseFinances({
    household: household,
    debts: snapshot.debts,
    assets: snapshot.assets,
    family: snapshot.family,
  });
}
