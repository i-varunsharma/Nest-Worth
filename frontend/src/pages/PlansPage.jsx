import { useState } from 'react';
import AppShell from '../components/layout/AppShell';
import { PageError, PageLoading } from '../components/layout/PageStatus';
import ScenarioLines from '../components/charts/ScenarioLines';
import PlanConsequences from '../components/plans/PlanConsequences';
import PlanOverview from '../components/plans/PlanOverview';
import PlansTable from '../components/plans/PlansTable';
import Card from '../components/shared/Card';
import Overline from '../components/shared/Overline';
import PillGroup from '../components/shared/PillGroup';
import useAsyncData from '../hooks/useAsyncData';
import { formatRupees } from '../lib/format';
import { loadFinances } from '../lib/loadFinances';

/*
  /plans: the same money spent several ways, each played out fifteen years. One
  plan is read at a time, with the others behind it for comparison.
*/

const COUNT_WORDS = ['no', 'one', 'two', 'three', 'four', 'five'];

// Shown while loading. Once the plans arrive, the heading says how many there are.
const TITLE = 'Plans';

/*
  Loads through loadFinances, like every other page that shows plan numbers, so
  the plans here are built by the same summariseFinances as the dashboard.

  today is where every plan starts from, used by the cards below the chart.
*/
async function loadPlansPage() {
  const result = await loadFinances();

  if (result.ok === false) {
    return result;
  }

  const finances = result.data.finances;

  if (finances === null) {
    return { ok: false, error: 'Answer the household questions first, then there is something to compare.' };
  }

  // Rounded to one decimal place, so "2.3 months" rather than "2.2857 months".
  const monthsCovered = Math.round(finances.safety.monthsCovered * 10) / 10;

  return {
    ok: true,
    data: {
      scenarios: finances.scenarios,
      chosenPlan: result.data.household.chosenPlan,
      today: {
        income: finances.recommendedPlan.income,
        monthlyCosts: finances.monthlyCosts,
        liquidSavings: finances.netWorth.liquidAssets,
        monthsCovered: monthsCovered,
        monthsTarget: finances.safety.monthsTarget,
        debtCount: result.data.debts.length,
        totalOwed: finances.netWorth.totalDebts,
      },
    },
  };
}

function findScenario(scenarios, key) {
  for (const scenario of scenarios) {
    if (scenario.key === key) {
      return scenario;
    }
  }
  return null;
}

export default function PlansPage({ user }) {
  const page = useAsyncData(loadPlansPage);

  // The plan being read, and the plan saved as followed. null means "use what loaded".
  const [pickedKey, setPickedKey] = useState(null);
  const [savedFollowing, setSavedFollowing] = useState({ hasChanged: false, key: null });

  if (page.error) {
    return <PageError user={user} title={TITLE} message={page.error} />;
  }

  if (page.data === null) {
    return <PageLoading user={user} title={TITLE} label="Working out your options" stats={3} cards={2} />;
  }

  const scenarios = page.data.scenarios;
  const today = page.data.today;

  let followingKey = page.data.chosenPlan;
  if (savedFollowing.hasChanged === true) {
    followingKey = savedFollowing.key;
  }

  // Open on the followed plan, so somebody who chose one comes back to it.
  let active = findScenario(scenarios, pickedKey);
  if (active === null) {
    active = findScenario(scenarios, followingKey);
  }
  if (active === null) {
    active = scenarios[0];
  }

  let baseline = findScenario(scenarios, 'balanced');
  if (baseline === null) {
    baseline = scenarios[0];
  }

  // The heading says how many plans there really are: no debts means no debt plan.
  let countWord = String(scenarios.length);
  if (scenarios.length < COUNT_WORDS.length) {
    countWord = COUNT_WORDS[scenarios.length];
  }

  const options = scenarios.map((scenario) => {
    return { key: scenario.key, label: scenario.name, marker: scenario.key === followingKey };
  });

  return (
    <AppShell
      user={user}
      title={'The same money, ' + countWord + ' ways.'}
      subtitle={'On ' + formatRupees(today.income) + ' a month. Pick one to see where it lands.'}
    >
      <PillGroup options={options} selectedKey={active.key} onSelect={setPickedKey} markerLabel="you are following this" />

      <PlanOverview
        active={active}
        baseline={baseline}
        income={today.income}
        followingKey={followingKey}
        onFollowChanged={(key) => setSavedFollowing({ hasChanged: true, key: key })}
      />

      <Card size="panel" className="mt-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Overline>What each one is worth</Overline>
            <h2 className="mt-3 max-w-md font-display text-[24px] leading-snug tracking-[-0.01em]">
              Fifteen years of the same salary, spent {countWord} ways.
            </h2>
          </div>
          <p className="max-w-xs text-[13px] leading-relaxed text-muted">
            Everything you would have: invested plus cash. Hover to read any year. Assumes 11% a year on the
            invested part, which is what the market has paid over long periods, not a promise.
          </p>
        </div>

        <div className="mt-7">
          <ScenarioLines scenarios={scenarios} activeKey={active.key} />
        </div>
      </Card>

      <PlanConsequences scenarios={scenarios} active={active} today={today} />

      <PlansTable scenarios={scenarios} activeKey={active.key} hasDebts={today.debtCount > 0} />

      <p className="mt-14 border-t border-line pt-7 text-2xs leading-relaxed text-muted">
        Every figure here is a projection, not a promise. It assumes the market keeps paying roughly what it has
        paid over long periods, that your income holds, and that you actually keep to the plan. Educational
        guidance, not regulated investment advice.
      </p>
    </AppShell>
  );
}
