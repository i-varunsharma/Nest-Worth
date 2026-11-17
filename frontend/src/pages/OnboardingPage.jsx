import OnboardingFlow from '../components/onboarding/OnboardingFlow';
import useAsyncData from '../hooks/useAsyncData';
import * as api from '../lib/api';

/*
  /onboarding: the questions the plan is built from. Shown straight after signing
  up, and again from Settings to change the answers.
*/

/*
  The saved answers, so coming back to edit shows them rather than defaults,
  and whether any assets exist yet, which decides if savings is asked about.
*/
async function loadHouseholdAnswers() {
  const results = await Promise.all([api.getHousehold(), api.getAssets()]);

  for (const result of results) {
    if (result.ok === false) {
      return result;
    }
  }

  const saved = results[0].data.household;
  const assets = results[1].data.assets;

  return {
    ok: true,
    data: {
      household: {
        income: saved.income,
        dependents: saved.dependents,
        hasLoan: saved.hasLoan,
        incomeVaries: saved.incomeVaries,
        essentialCosts: saved.essentialCosts,
      },
      askSavings: assets.length === 0,
    },
  };
}

export default function OnboardingPage({ user }) {
  const answers = useAsyncData(loadHouseholdAnswers);

  if (answers.error) {
    return (
      <div className="grid min-h-screen place-items-center bg-paper px-6">
        <p role="alert" className="max-w-sm text-center text-[14.5px] text-clay">{answers.error}</p>
      </div>
    );
  }

  if (answers.data === null) {
    return (
      <div className="grid min-h-screen place-items-center bg-paper">
        <p className="text-[14px] text-muted">Loading…</p>
      </div>
    );
  }

  // The flow is only mounted once the answers exist, so its state starts from them.
  return <OnboardingFlow user={user} household={answers.data.household} askSavings={answers.data.askSavings} />;
}
