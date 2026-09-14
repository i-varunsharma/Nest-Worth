import { assetRepository } from '../repositories/assetRepository.js';
import { debtRepository } from '../repositories/debtRepository.js';
import { familyRepository } from '../repositories/familyRepository.js';
import { goalRepository } from '../repositories/goalRepository.js';
import { householdRepository } from '../repositories/householdRepository.js';
import { summariseFinances } from '../../../shared/finances.js';

/*
  One person's financial picture, read from the database and worked out with
  shared/finances.js, the same function the browser uses. The scenarios route
  and the AI tools start here, so the server and the pages cannot disagree.
*/


/* Everything stored for one user. household is null before onboarding. */
export function readSnapshot(userId) {
  return {
    household: householdRepository.find(userId),
    debts: debtRepository.list(userId),
    goals: goalRepository.list(userId),
    assets: assetRepository.list(userId),
    family: familyRepository.list(userId),
  };
}


/* The snapshot and its finances, or null when there is no household yet. */
export function readFinances(userId) {
  const snapshot = readSnapshot(userId);

  if (snapshot.household === null) {
    return null;
  }

  const finances = summariseFinances({
    household: snapshot.household,
    debts: snapshot.debts,
    assets: snapshot.assets,
    family: snapshot.family,
  });

  return { snapshot: snapshot, finances: finances };
}
