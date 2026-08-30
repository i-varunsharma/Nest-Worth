import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import AppShell from '../components/app/AppShell';
import PlanCard from '../components/app/PlanCard';
import PriorityCard from '../components/app/PriorityCard';
import OutflowCard from '../components/app/OutflowCard';
import ProjectionChart from '../components/landing/ProjectionChart';
import Eyebrow from '../components/shared/Eyebrow';
import * as api from '../lib/api';
import { buildPlan, buildProjectionRows, formatRupees } from '../lib/plan';
import { formatDuration, formatMonthYear, orderByRate, summariseDebts } from '../lib/debt';
import { safetyNet, summariseGoals } from '../lib/goals';
import { summariseNetWorth } from '../lib/networth';
import { greetingForNow } from '../lib/household';

/*
  DashboardPage
  -------------
  The screen at /dashboard: the overview everything else hangs off.

  It does no editing. Every number here is a summary of a page that owns it, and
  every summary links to that page. That is the whole idea of an overview: it
  answers "how am I doing" in one screen, and every answer is a door to the
  detail.

  It fetches five things at once and does the maths once, then hands finished
  pieces to the cards. Keeping the thinking in one place and the drawing in
  another is what stops a page like this becoming a thousand-line file.

  Props:
    user - the signed-in person, handed down by RequireAuth
*/

const PROJECTION_YEARS = 15;

export default function DashboardPage({ user }) {
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState('');

  /*
    Fetch everything the overview needs, all at once.

    Promise.all sends all five requests together rather than waiting for each
    before starting the next. None of them depends on another, so queueing them
    would make the page five times slower for no reason.
  */
  useEffect(() => {
    let stillMounted = true;

    const load = async () => {
      const [household, debts, goals, assets, checkins] = await Promise.all([
        api.getHousehold(),
        api.getDebts(),
        api.getGoals(),
        api.getAssets(),
        api.getCheckins(),
      ]);

      if (!stillMounted) {
        return;
      }

      if (!household.ok) {
        setLoadError(household.error);
        return;
      }

      setData({
        household: household.data.household,
        debts: debts.ok ? debts.data.debts : [],
        goals: goals.ok ? goals.data.goals : [],
        assets: assets.ok ? assets.data.assets : [],
        checkins: checkins.ok ? checkins.data.checkins : [],
      });
    };

    load();

    return () => {
      stillMounted = false;
    };
  }, []);

  if (loadError) {
    return (
      <div className="grid min-h-screen place-items-center bg-paper px-6">
        <p className="max-w-sm text-center text-[14.5px] text-clay">{loadError}</p>
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="grid min-h-screen place-items-center bg-paper">
        <p className="text-[14px] text-muted">Loading your plan…</p>
      </div>
    );
  }

  // Signed in, but the questions were never answered. Nothing to show yet.
  if (data.household.isSaved === false) {
    return <Navigate to="/onboarding" replace />;
  }

  // ---------------------------------------------------------------
  // The maths, once.
  // ---------------------------------------------------------------

  const debtSummary = summariseDebts(data.debts);

  /*
    The plan now uses the REAL total EMI rather than an estimate, because the
    debts page knows the actual figures. This is the moment the whole app stops
    being illustrative: what is left each month is worked out from money that
    genuinely leaves the account.
  */
  // The most expensive debt, so the reasoning can name it rather than guess.
  const orderedDebts = orderByRate(data.debts);
  const worstDebt = orderedDebts[0];

  const plan = buildPlan({
    income: data.household.income,
    dependents: data.household.dependents,
    hasLoan: data.debts.length > 0,
    emi: debtSummary.totalEmi,
    topRate: worstDebt ? worstDebt.annualRate : undefined,
    topDebtName: worstDebt ? worstDebt.name.toLowerCase() : undefined,
  });

  let monthlyInvestment = 0;
  let monthlySaving = 0;
  let monthlySpend = 0;

  plan.buckets.forEach((bucket) => {
    if (bucket.key === 'invest') monthlyInvestment = bucket.amount;
    if (bucket.key === 'save') monthlySaving = bucket.amount;
    if (bucket.key === 'spend') monthlySpend = bucket.amount;
  });

  const netWorth = summariseNetWorth(data.assets, data.debts);
  const goalSummary = summariseGoals(data.goals, monthlySaving);

  // The emergency fund compares cash you can actually reach against what one
  // month costs you: living costs plus everything that leaves before that.
  const monthlyOutgoings = monthlySpend + plan.support + plan.emi;
  const safety = safetyNet(netWorth.liquidAssets, monthlyOutgoings, data.household.dependents);

  const projectionRows = buildProjectionRows(monthlyInvestment, PROJECTION_YEARS);
  const finalValue = projectionRows[projectionRows.length - 1].value;

  const thisMonth = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  let greeting = greetingForNow() + '.';
  if (user.name) {
    greeting = greetingForNow() + ', ' + user.name + '.';
  }

  // ---------------------------------------------------------------
  // The four headline numbers across the top.
  // ---------------------------------------------------------------
  const headlines = [
    {
      to: '/net-worth',
      label: 'Net worth',
      value: formatRupees(netWorth.netWorth, { short: true }),
      note: formatRupees(netWorth.totalAssets, { short: true }) + ' owned, '
        + formatRupees(netWorth.totalDebts, { short: true }) + ' owed',
      isNegative: netWorth.netWorth < 0,
    },
    {
      to: '/debts',
      label: 'Debt free',
      value: data.debts.length === 0 ? 'Now' : formatMonthYear(debtSummary.debtFreeDate),
      note: data.debts.length === 0
        ? 'Nothing owed'
        : formatDuration(debtSummary.longestMonths) + ' away',
      isNegative: false,
    },
    {
      to: '/net-worth',
      label: 'Safety net',
      value: safety.monthsCovered.toFixed(1) + ' mo',
      note: 'target ' + safety.monthsTarget + ' months',
      isNegative: !safety.isEnough,
    },
    {
      to: '/goals',
      label: 'Goals',
      value: data.goals.length === 0 ? 'None yet' : String(data.goals.length),
      note: data.goals.length === 0
        ? 'Add your first'
        : (goalSummary.isAffordable ? 'all affordable' : 'over budget'),
      isNegative: data.goals.length > 0 && !goalSummary.isAffordable,
    },
  ];

  return (
    <AppShell
      user={user}
      title={greeting}
      subtitle={'Your plan for ' + thisMonth + ', built from your household.'}
      action={
        <Link
          to="/check-in"
          className="group inline-flex items-center gap-2 rounded-full border border-line bg-surface px-5 py-2.5 text-[13.5px] font-semibold text-ink transition-all duration-300 ease-smooth hover:border-ink hover:shadow-card"
        >
          Check in for this month
          <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-0.5">
            &#8594;
          </span>
        </Link>
      }
    >

      {/* ---------- Four numbers, each a door to its own page ---------- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {headlines.map((item) => {
          return (
            <Link
              key={item.label}
              to={item.to}
              className="group rounded-[18px] border border-line bg-surface p-5 shadow-card transition-all duration-300 ease-smooth hover:-translate-y-0.5 hover:border-ink/25 hover:shadow-lift"
            >
              <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">
                {item.label}
              </p>
              <p
                className={
                  'tnum mt-2.5 font-display text-[28px] leading-none '
                  + (item.isNegative ? 'text-clay' : 'text-accent')
                }
              >
                {item.value}
              </p>
              <p className="mt-2 text-2xs text-muted">{item.note}</p>
            </Link>
          );
        })}
      </div>

      {/* ---------- The plan ---------- */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <PlanCard plan={plan} />

        <div className="space-y-6">
          <PriorityCard reasoning={plan.reasoning} />

          {/* Safety net, in words rather than a bar alone. */}
          <div className="rounded-[26px] border border-line bg-surface p-6 shadow-card sm:p-7">
            <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">
              If your income stopped
            </p>

            <p className="tnum mt-4 font-display text-[30px] leading-none">
              {safety.monthsCovered.toFixed(1)} months
            </p>

            <p className="mt-3 text-[14px] leading-relaxed text-ink2">
              {formatRupees(netWorth.liquidAssets)} you could reach quickly, against{' '}
              {formatRupees(monthlyOutgoings)} a month of costs.
            </p>

            <div className="mt-5 h-2 overflow-hidden rounded-full bg-paperDeep">
              <div
                className={
                  'h-full rounded-full transition-[width] duration-700 ease-smooth '
                  + (safety.isEnough ? 'bg-accent' : 'bg-brass')
                }
                style={{ width: safety.percentDone + '%' }}
              />
            </div>

            <p className="mt-3 text-2xs text-muted">
              {safety.isEnough === true
                ? 'Comfortably past the ' + safety.monthsTarget + ' months we suggest.'
                : formatRupees(safety.amountTarget - netWorth.liquidAssets)
                  + ' more would get you to ' + safety.monthsTarget + ' months.'}
            </p>
          </div>
        </div>
      </div>

      {/* ---------- Where the money goes ---------- */}
      <div className="mt-6">
        <OutflowCard
          plan={plan}
          dependents={data.household.dependents}
          hasLoan={data.debts.length > 0}
        />
      </div>

      {/* ---------- The long view ---------- */}
      <div id="future" className="mt-16">
        <Eyebrow>Future you</Eyebrow>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-5">
          <h2 className="max-w-md font-display text-[clamp(1.7rem,3vw,2.3rem)] leading-[1.1] tracking-[-0.02em]">
            Keep the {formatRupees(monthlyInvestment)} going and this is where it lands.
          </h2>
          <p className="tnum font-display text-[clamp(2rem,4vw,2.8rem)] leading-none text-accent">
            {formatRupees(finalValue, { short: true })}
          </p>
        </div>

        <div className="mt-7">
          <ProjectionChart rows={projectionRows} years={PROJECTION_YEARS} />
        </div>
      </div>

      <p className="mt-14 border-t border-line pt-7 text-2xs leading-relaxed text-muted">
        Educational guidance, not regulated investment advice. Your answers are stored against
        your account and are never sold or shared.
      </p>
    </AppShell>
  );
}
