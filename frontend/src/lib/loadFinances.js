import * as api from './api';
import { summariseFinances } from './finances';

/*
  Fetches everything the plan is built from and works the plan out.

  Every page that shows a plan figure loads it through here, so no two pages can
  build the plan from different inputs.

  Returns the same shape as api.js:
    { ok: false, error }
    { ok: true, data: { household, debts, assets, family, finances } }

  finances is null before onboarding is finished. If any request fails, the
  whole load fails: drawing a plan with the debts missing would look right and
  be wrong.
*/
export async function loadFinances() {
  const results = await Promise.all([
    api.getHousehold(),
    api.getDebts(),
    api.getAssets(),
    api.getFamily(),
  ]);

  for (const result of results) {
    if (result.ok === false) {
      return result;
    }
  }

  const household = results[0].data.household;
  const debts = results[1].data.debts;
  const assets = results[2].data.assets;
  const family = results[3].data.family;

  let finances = null;

  if (household.isSaved === true) {
    finances = summariseFinances({ household: household, debts: debts, assets: assets, family: family });
  }

  return {
    ok: true,
    data: { household: household, debts: debts, assets: assets, family: family, finances: finances },
  };
}
