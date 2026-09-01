import { useEffect, useState } from 'react';
import AppShell from '../components/app/AppShell';
import AllocationBar from '../components/charts/AllocationBar';
import ScenarioLines from '../components/charts/ScenarioLines';
import SafetyMeter from '../components/charts/SafetyMeter';
import DebtDumbbell from '../components/charts/DebtDumbbell';
import Eyebrow from '../components/shared/Eyebrow';
import * as api from '../lib/api';
import { formatRupees } from '../lib/plan';
import { formatDuration, formatMonthYear } from '../lib/debt';

/*
  The screen at /plans: the same money, spent four different ways.

  Every other screen in this app answers "how am I doing". This one answers a
  harder question, which is "what if I chose differently", and it is the only
  place somebody can see what a decision actually costs them.

  Nothing here is calculated in the browser. The server plays each choice out
  month by month, fifteen years, in shared/scenarios.js, and this page draws the
  result. That matters because the interesting comparison is the one a simpler
  version gets wrong: paying extra at a debt looks worse for years, until the
  debt clears and the EMI becomes money to invest.

  One choice is selected at a time rather than showing all four at once. Four
  sets of everything is a page nobody reads. One plan, with the others as
  context behind it, is a page that answers a question.

  Props:
    user - the signed-in person, handed down by RequireAuth
*/

export default function PlansPage({ user }) {
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState('');

  // Which plan is being read. Null until the data arrives and the first one
  // becomes the selection.
  const [activeKey, setActiveKey] = useState(null);

  useEffect(() => {
    // Set to false when this page is left, so a slow answer arriving afterwards
    // does not try to update state that has gone.
    let stillMounted = true;

    const load = async () => {
      const result = await api.getScenarios();

      if (!stillMounted) {
        return;
      }

      if (result.ok === false) {
        setLoadError(result.error);
        return;
      }

      setData(result.data);

      if (result.data.scenarios.length > 0) {
        setActiveKey(result.data.scenarios[0].key);
      }
    };

    load();

    return () => {
      stillMounted = false;
    };
  }, []);

  if (loadError) {
    return (
      <div className="grid min-h-screen place-items-center bg-paper px-6">
        <p className="max-w-sm text-center text-[14.5px] leading-relaxed text-clay">{loadError}</p>
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="grid min-h-screen place-items-center bg-paper">
        <p className="text-[14px] text-muted">Working out your options…</p>
      </div>
    );
  }

  const scenarios = data.scenarios;
  const today = data.today;

  // Which one is on screen. Falls back to the first, so a bad key can never
  // leave the page blank.
  let active = scenarios[0];

  scenarios.forEach((scenario) => {
    if (scenario.key === activeKey) {
      active = scenario;
    }
  });

  /*
    The headline: what this choice is worth against the plan as it stands.

    Comparing to the baseline rather than showing a bare number is what makes it
    mean anything. "₹54 lakh" is impressive and useless; "₹13 lakh more than
    your plan as it stands" is a reason to change something.
  */
  let baseline = scenarios[0];

  scenarios.forEach((scenario) => {
    if (scenario.key === 'balanced') {
      baseline = scenario;
    }
  });

  const difference = active.outcomes.totalAfterYears - baseline.outcomes.totalAfterYears;

  let differenceLine = 'The same as your plan as it stands.';

  if (difference > 0) {
    differenceLine = formatRupees(difference, { short: true })
      + ' more than your plan as it stands.';
  } else if (difference < 0) {
    differenceLine = formatRupees(Math.abs(difference), { short: true })
      + ' less than your plan as it stands, and it clears the debt sooner.';
  }

  // The debt-free line for the selected plan.
  let debtLine = 'You have no debts recorded.';

  if (today.debtCount > 0) {
    if (active.outcomes.debtFreeMonths === null) {
      debtLine = 'On this plan the debt does not clear within fifteen years.';
    } else {
      debtLine = 'Debt free by ' + formatMonthYear(new Date(active.outcomes.debtFreeDate))
        + ', which is ' + formatDuration(active.outcomes.debtFreeMonths) + ' away.';
    }
  }

  /*
    How many plans there actually are, in words.

    The heading used to say "four ways" whatever the number was. Somebody with
    no debts is never offered the debt plan, so they saw three options under a
    heading promising four, which reads as a page that failed to load half of
    itself.
  */
  const COUNT_WORDS = ['no', 'one', 'two', 'three', 'four', 'five'];

  let countWord = String(scenarios.length);

  if (scenarios.length < COUNT_WORDS.length) {
    countWord = COUNT_WORDS[scenarios.length];
  }

  // Whether anything on this page needs to talk about debt at all.
  const hasDebts = today.debtCount > 0;

  return (
    <AppShell
      user={user}
      title={'The same money, ' + countWord + ' ways.'}
      subtitle={'On ' + formatRupees(today.income) + ' a month. Pick one to see where it lands.'}
    >

      {/* ---------- Choosing a plan ---------- */}
      {/*
        Real buttons, not a fancy custom control. A button is reachable by
        keyboard and announced correctly by a screen reader without any work,
        and aria-pressed is what says which one is currently chosen.
      */}
      <div className="flex flex-wrap gap-2.5">
        {scenarios.map((scenario) => {
          const isActive = scenario.key === active.key;

          let classes = 'rounded-full border px-5 py-2.5 text-[13.5px] font-semibold transition-all duration-300 ease-smooth ';

          if (isActive === true) {
            classes = classes + 'border-accent bg-accent text-white shadow-card';
          } else {
            classes = classes + 'border-line bg-surface text-ink2 hover:border-ink hover:text-ink';
          }

          return (
            <button
              key={scenario.key}
              type="button"
              onClick={() => setActiveKey(scenario.key)}
              aria-pressed={isActive}
              className={classes}
            >
              {scenario.name}
            </button>
          );
        })}
      </div>

      {/* ---------- What this plan is ---------- */}
      <div className="mt-8 rounded-[26px] border border-line bg-surface p-6 shadow-card sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-lg">
            <Eyebrow>{active.name}</Eyebrow>
            <p className="mt-4 text-[15.5px] leading-relaxed text-ink2">{active.idea}</p>
          </div>

          <div className="text-right">
            <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">
              In 15 years
            </p>
            <p className="tnum mt-2 font-display text-[clamp(2rem,4vw,2.8rem)] leading-none text-accent">
              {formatRupees(active.outcomes.totalAfterYears, { short: true })}
            </p>
            <p className="mt-1.5 text-2xs text-muted">invested plus cash</p>
            <p className="mt-2 text-2xs text-muted">{differenceLine}</p>
          </div>
        </div>

        {/* ---------- Where every rupee goes ---------- */}
        <div className="mt-9 border-t border-lineSoft pt-7">
          <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">
            Where every rupee of {formatRupees(today.income)} goes
          </p>

          <div className="mt-5">
            <AllocationBar allocation={active.allocation} income={today.income} />
          </div>
        </div>
      </div>

      {/* ---------- The comparison ---------- */}
      <div className="mt-6 rounded-[26px] border border-line bg-surface p-6 shadow-card sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">
              What each one is worth
            </p>
            <h2 className="mt-3 max-w-md font-display text-[24px] leading-snug tracking-[-0.01em]">
              Fifteen years of the same salary, spent {countWord} ways.
            </h2>
          </div>

          <p className="max-w-xs text-[13px] leading-relaxed text-muted">
            Everything you would have: invested plus cash. Hover to read any year. Assumes
            11% a year on the invested part, which is what the market has paid over long
            periods, not a promise.
          </p>
        </div>

        <div className="mt-7">
          <ScenarioLines scenarios={scenarios} activeKey={active.key} />
        </div>
      </div>

      {/* ---------- The side effects of choosing ---------- */}
      {/*
        Two columns only when there are two cards to put in them. With no debts
        the debt card is not rendered, and a two-column grid then left the
        safety net card marooned in the left half with an empty right half
        beside it, which looks like something failed to load.
      */}
      <div className={'mt-6 grid gap-6 ' + (hasDebts === true ? 'lg:grid-cols-2' : '')}>

        {/* Debt, if there is any. */}
        {hasDebts === true ? (
          <div className="rounded-[26px] border border-line bg-surface p-6 shadow-card sm:p-7">
            <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">
              When the debt goes
            </p>
            <p className="mt-3 text-[14px] leading-relaxed text-ink2">{debtLine}</p>

            <div className="mt-6">
              <DebtDumbbell scenarios={scenarios} activeKey={active.key} />
            </div>
          </div>
        ) : null}

        {/* The safety net. */}
        <div className="rounded-[26px] border border-line bg-surface p-6 shadow-card sm:p-7">
          <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">
            If your income stopped
          </p>

          <div className="mt-5">
            <SafetyMeter
              monthsCovered={active.outcomes.monthsCoveredInAYear}
              monthsTarget={today.monthsTarget}
            />
          </div>

          <p className="mt-6 border-t border-lineSoft pt-5 text-2xs leading-relaxed text-muted">
            Counted from {formatRupees(today.liquidSavings)} you can reach today, plus a year of
            this plan&rsquo;s saving. Only cash and fixed deposits count. Selling a flat to cover a
            bad month is not a plan.
          </p>
        </div>
      </div>

      {/* ---------- The table ---------- */}
      {/*
        Every figure on this page in one place.

        It is here because a chart is not readable by everybody. Somebody using
        a screen reader, or printing the page, or who simply wants the numbers,
        gets them without having to interpret a shape. Nothing on this page is
        available ONLY as a picture.
      */}
      <div className="mt-6 rounded-[26px] border border-line bg-surface p-6 shadow-card sm:p-7">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">
            All of it, as numbers
          </p>

          {/* On a phone this table is wider than the screen and scrolls
              sideways. Without saying so, the columns past the edge are simply
              invisible and nobody goes looking for them. */}
          <p className="text-2xs text-muted sm:hidden">Scroll sideways for the rest &#8594;</p>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line">
                <th className="pb-3 pr-4 text-2xs font-semibold uppercase tracking-widest2 text-muted">
                  Plan
                </th>
                <th className="pb-3 pr-4 text-2xs font-semibold uppercase tracking-widest2 text-muted">
                  Spend
                </th>
                <th className="pb-3 pr-4 text-2xs font-semibold uppercase tracking-widest2 text-muted">
                  Save
                </th>
                <th className="pb-3 pr-4 text-2xs font-semibold uppercase tracking-widest2 text-muted">
                  Invest
                </th>
                {hasDebts === true ? (
                  <th className="pb-3 pr-4 text-2xs font-semibold uppercase tracking-widest2 text-muted">
                    Extra at debt
                  </th>
                ) : null}
                {hasDebts === true ? (
                  <th className="pb-3 pr-4 text-2xs font-semibold uppercase tracking-widest2 text-muted">
                    Debt free
                  </th>
                ) : null}
                <th className="pb-3 text-2xs font-semibold uppercase tracking-widest2 text-muted">
                  In 15 years, in total
                </th>
              </tr>
            </thead>

            <tbody>
              {scenarios.map((scenario) => {
                const isActive = scenario.key === active.key;

                let rowClasses = 'border-b border-lineSoft text-[13.5px] text-ink2';
                if (isActive === true) {
                  rowClasses = 'border-b border-lineSoft bg-accentSoft/50 text-[13.5px] text-ink';
                }

                let debtCell = '—';

                if (scenario.outcomes.debtFreeMonths === null) {
                  debtCell = 'never';
                } else if (scenario.outcomes.debtFreeMonths > 0) {
                  debtCell = formatDuration(scenario.outcomes.debtFreeMonths);
                }

                return (
                  <tr key={scenario.key} className={rowClasses}>
                    <td className="py-3 pr-4 font-medium">{scenario.name}</td>
                    <td className="tnum py-3 pr-4">{formatRupees(scenario.allocation.spend)}</td>
                    <td className="tnum py-3 pr-4">{formatRupees(scenario.allocation.save)}</td>
                    <td className="tnum py-3 pr-4">{formatRupees(scenario.allocation.invest)}</td>
                    {hasDebts === true ? (
                      <td className="tnum py-3 pr-4">
                        {formatRupees(scenario.allocation.extraToDebt)}
                      </td>
                    ) : null}
                    {hasDebts === true ? (
                      <td className="tnum py-3 pr-4">{debtCell}</td>
                    ) : null}
                    <td className="tnum py-3 font-semibold">
                      {formatRupees(scenario.outcomes.totalAfterYears, { short: true })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-14 border-t border-line pt-7 text-2xs leading-relaxed text-muted">
        Every figure here is a projection, not a promise. It assumes the market keeps paying
        roughly what it has paid over long periods, that your income holds, and that you
        actually keep to the plan. Educational guidance, not regulated investment advice.
      </p>
    </AppShell>
  );
}
