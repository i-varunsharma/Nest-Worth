import * as api from './api';
import { summariseFinances } from './finances';

/*
  Fetches everything the plan is built from and works the plan out.

  Every page that shows a plan figure calls this: the dashboard, goals,
  check-in, family and stress test pages. Loading it one way in one place is
  what stops two pages quietly using different inputs.

  Returns one of:
    { ok: false, error }
    { ok: true, household, debts, assets, family, finances }

  finances is null when onboarding was never finished, because there is no
  income to build a plan from yet.

  If any request fails the whole load fails with that message. Carrying on
  with an empty list would draw a plan with the debts missing, which looks
  fine and is wrong.
*/
export async function loadFinances() {
  // All four at once. None depends on another, so there is no reason to wait.
  const results = await Promise.all([
    api.getHousehold(),
    api.getDebts(),
    api.getAssets(),
    api.getFamily(),
  ]);

  for (const result of results) {
    if (result.ok === false) {
      return { ok: false, error: result.error };
    }
  }

  const household = results[0].data.household;
  const debts = results[1].data.debts;
  const assets = results[2].data.assets;
  const family = results[3].data.family;

  let finances = null;

  if (household.isSaved === true) {
    finances = summariseFinances({
      household: household,
      debts: debts,
      assets: assets,
      family: family,
    });
  }

  return {
    ok: true,
    household: household,
    debts: debts,
    assets: assets,
    family: family,
    finances: finances,
  };
}
