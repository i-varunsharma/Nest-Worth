import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import AppShell from '../components/app/AppShell';
import PlanCard from '../components/app/PlanCard';
import PriorityCard from '../components/app/PriorityCard';
import OutflowCard from '../components/app/OutflowCard';
import ConsistencyCard from '../components/app/ConsistencyCard';
import CoachCard from '../components/app/CoachCard';
import BriefingCard from '../components/app/BriefingCard';
import ProjectionChart from '../components/landing/ProjectionChart';
import Eyebrow from '../components/shared/Eyebrow';
import CountUp from '../components/shared/CountUp';
import { Skeleton, SkeletonCard, SkeletonScreen, SkeletonStat } from '../components/shared/Skeleton';
import * as api from '../lib/api';
import { buildPlan, buildProjectionRows, bucketAmount, formatRupees } from '../lib/plan';
import { applyChosenPlan } from '../lib/scenarios';
import { formatDuration, formatMonthYear, orderByRate, summariseDebts } from '../lib/debt';
import { safetyNet, summariseGoals } from '../lib/goals';
import { summariseNetWorth } from '../lib/networth';
import { greetingForNow } from '../lib/household';
import { currentMonth, hasCheckinFor, summariseCheckins } from '../lib/checkins';

/*
  The screen at /dashboard: the overview everything else hangs off.

  It does no editing. Every number here is a summary of a page that owns it, and
  every summary links to that page. An overview is meant to be a way in: it
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
      const [household, debts, goals, assets, checkins, scenarios] = await Promise.all([
        api.getHousehold(),
        api.getDebts(),
        api.getGoals(),
        api.getAssets(),
        api.getCheckins(),
        api.getScenarios(),
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

        // Only needed when a plan has been chosen. It failing is not worth
        // stopping the dashboard for: the page falls back to the recommended
        // split, which is what it always showed.
        scenarios: scenarios.ok ? scenarios.data.scenarios : [],
      });
    };

    load();

    return () => {
      stillMounted = false;
    };
  }, []);

  // Needed by both the loading screen and the real one, so it is worked out
  // before either of them.
  const thisMonth = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  if (loadError) {
    return (
      <div className="grid min-h-screen place-items-center bg-paper px-6">
        <p className="max-w-sm text-center text-[14.5px] text-clay">{loadError}</p>
      </div>
    );
  }

  /*
    Still fetching.

    This draws the real page frame with grey blocks where the numbers will go,
    rather than a "Loading…" line in the middle of an empty screen. The heading
    and the top bar are already correct, because neither needs anything from the
    server, so only the part that is genuinely unknown looks unknown.
  */
  if (data === null) {
    let loadingGreeting = greetingForNow() + '.';
    if (user.name) {
      loadingGreeting = greetingForNow() + ', ' + user.name + '.';
    }

    return (
      <AppShell user={user} title={loadingGreeting} subtitle={thisMonth}>
        <SkeletonScreen label="Loading your plan">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SkeletonStat />
            <SkeletonStat />
            <SkeletonStat />
            <SkeletonStat />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <SkeletonCard />

            <div className="space-y-6">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          </div>

          <Skeleton className="mt-6 h-40 w-full rounded-[18px]" />
        </SkeletonScreen>
      </AppShell>
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

  // The plan uses the real total EMI from the debts page rather than an
  // estimate, so what is left each month comes from money that genuinely
  // leaves the account.
  //
  // The most expensive debt is passed in too, so the reasoning can name it.
  const orderedDebts = orderByRate(data.debts);
  const worstDebt = orderedDebts[0];

  const recommendedPlan = buildPlan({
    income: data.household.income,
    dependents: data.household.dependents,
    hasLoan: data.debts.length > 0,
    incomeVaries: data.household.incomeVaries,
    essentialCosts: data.household.essentialCosts,
    emi: debtSummary.totalEmi,
    topRate: worstDebt ? worstDebt.annualRate : undefined,
    topDebtName: worstDebt ? worstDebt.name.toLowerCase() : undefined,
  });

  /*
    Which plan this dashboard is actually showing.

    By default it is the one the model recommends. If they chose a different
    one on /plans, that choice replaces the three buckets here, and every
    number further down follows automatically: the goals check, the emergency
    fund, the projection, and the comparison against what they really did.

    Only the buckets are swapped. Nothing else on this page had to learn that
    plans exist.
  */
  let followedPlan = null;

  data.scenarios.forEach((scenario) => {
    if (scenario.key === data.household.chosenPlan) {
      followedPlan = scenario;
    }
  });

  let plan = recommendedPlan;

  if (followedPlan) {
    plan = applyChosenPlan(recommendedPlan, followedPlan);
  }

  const monthlyInvestment = bucketAmount(plan, 'invest');
  const monthlySaving = bucketAmount(plan, 'save');
  const monthlySpend = bucketAmount(plan, 'spend');

  const netWorth = summariseNetWorth(data.assets, data.debts);
  const goalSummary = summariseGoals(data.goals, monthlySaving);

  // The emergency fund compares cash you can actually reach against what one
  // month costs you: living costs plus everything that leaves before that.
  const monthlyOutgoings = monthlySpend + plan.support + plan.emi;
  const safety = safetyNet(
    netWorth.liquidAssets,
    monthlyOutgoings,
    data.household.dependents,
    data.household.incomeVaries,
  );

  const projectionRows = buildProjectionRows(monthlyInvestment, PROJECTION_YEARS);
  const finalValue = projectionRows[projectionRows.length - 1].value;

  // Has this month already been checked in? Both helpers live in lib/checkins.js
  // so this page and the check-in page cannot disagree about what a month is.
  const hasCheckedIn = hasCheckinFor(data.checkins, currentMonth());

  /*
    How the plan is actually going.

    The comparison has to be made against income, not against the plan's
    percentages. Those percentages are shares of what is left after the
    household and the EMI, whereas a check-in records real income and real
    amounts, so the two only line up once the plan is expressed the same way.
  */
  const plannedKept = monthlySaving + monthlyInvestment;

  let plannedKeptShare = 0;
  if (plan.income > 0) {
    plannedKeptShare = (plannedKept / plan.income) * 100;
  }

  const checkinSummary = summariseCheckins(data.checkins, plannedKeptShare);

  // The button in the corner says which of the two jobs is left.
  let checkInLabel = 'Check in for this month';
  let checkInClasses = 'border-line bg-surface text-ink hover:border-ink hover:shadow-card';

  if (hasCheckedIn === true) {
    checkInLabel = 'This month is recorded';
    checkInClasses = 'border-accent/30 bg-accentSoft text-accentDeep hover:border-accent';
  }

  /*
    Why there is nothing to project. Two quite different reasons, and telling
    somebody following the debt plan that they "have nothing left over" would
    be wrong: they chose this, and it is the right choice for a card at 42%.
  */
  let noInvestingNote = 'There is nothing left to invest once your household and your debts '
    + 'are paid. That changes as soon as either of those does.';

  if (followedPlan) {
    noInvestingNote = 'This plan sends that money somewhere else first, which is the point '
      + 'of it. The investing starts once that job is done, and everything freed up by then '
      + 'goes into it.';
  }

  let greeting = greetingForNow() + '.';
  if (user.name) {
    greeting = greetingForNow() + ', ' + user.name + '.';
  }

  // ---------------------------------------------------------------
  // The four headline numbers across the top.
  // ---------------------------------------------------------------

  // Worked out with plain ifs before the list, rather than as ternaries inside
  // it, so each card below is one readable line per field.
  const hasDebts = data.debts.length > 0;
  const hasGoals = data.goals.length > 0;

  let debtValue = 'Now';
  let debtNote = 'Nothing owed';

  if (hasDebts === true) {
    debtValue = formatMonthYear(debtSummary.debtFreeDate);
    debtNote = formatDuration(debtSummary.longestMonths) + ' away';

    // A debt whose EMI never clears it has no date, and longestMonths ignores
    // it, so without this the card would read "— / now away".
    if (debtSummary.everythingClears === false) {
      debtValue = 'Not yet';
      debtNote = 'one debt never clears';
    }
  }

  let goalValue = 'None yet';
  let goalNote = 'Add your first';

  if (hasGoals === true) {
    goalValue = String(data.goals.length);

    if (goalSummary.isAffordable === true) {
      goalNote = 'all affordable';
    } else {
      goalNote = 'over budget';
    }
  }

  /*
    Each card has either a countTo, meaning the figure is a number and should
    run up to itself, or a plain value for the ones that are not numbers. A
    date cannot be counted up to, and pretending otherwise would give you
    "March 2027" flickering through months that mean nothing.

    "format" is how the counting number is turned back into the text on screen,
    and it has to be a function rather than a finished string, because CountUp
    calls it again on every frame with a different number.
  */
  const headlines = [
    {
      to: '/net-worth',
      label: 'Net worth',
      countTo: netWorth.netWorth,
      format: (amount) => {
        return formatRupees(amount, { short: true });
      },
      note: formatRupees(netWorth.totalAssets, { short: true }) + ' owned, '
        + formatRupees(netWorth.totalDebts, { short: true }) + ' owed',
      isNegative: netWorth.netWorth < 0,
    },
    {
      to: '/debts',
      label: 'Debt free',
      value: debtValue,
      note: debtNote,
      isNegative: hasDebts === true && debtSummary.everythingClears === false,
    },
    {
      to: '/net-worth',
      label: 'Safety net',
      countTo: safety.monthsCovered,
      format: (months) => {
        return months.toFixed(1) + ' mo';
      },
      note: 'target ' + safety.monthsTarget + ' months',
      isNegative: !safety.isEnough,
    },
    {
      to: '/goals',
      label: 'Goals',
      value: goalValue,
      note: goalNote,
      isNegative: hasGoals === true && goalSummary.isAffordable === false,
    },
  ];

  return (
    <AppShell
      user={user}
      title={greeting}
      subtitle={thisMonth}
      action={
        <Link
          to="/check-in"
          className={
            'group inline-flex items-center gap-2 rounded-full border px-5 py-2.5 '
            + 'text-[13.5px] font-semibold transition-all duration-300 ease-smooth '
            + checkInClasses
          }
        >
          {checkInLabel}
          <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-0.5">
            &#8594;
          </span>
        </Link>
      }
    >

      {/* ---------- What the app noticed on its own ---------- */}
      {/* It draws nothing when there is nothing to say, and it fetches itself
          rather than waiting on the load above, so the page never sits still
          for it. */}
      <BriefingCard />

      {/* ---------- Which plan this is showing ---------- */}
      {/*
        Only when they have chosen one. Without this the dashboard would
        quietly show different numbers from the ones the model recommends,
        with nothing on screen to say why.
      */}
      {followedPlan ? (
        <Link
          to="/plans"
          className="group mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-accent/25 bg-accentSoft px-5 py-4 transition-colors duration-300 hover:border-accent/50"
        >
          <p className="text-[14px] leading-relaxed text-ink2">
            <span className="font-semibold text-accentDeep">Following: {followedPlan.name}.</span>{' '}
            {followedPlan.idea}
          </p>

          <span className="shrink-0 text-2xs font-semibold uppercase tracking-widest2 text-accentDeep">
            Change
            <span aria-hidden="true" className="ml-1.5 inline-block transition-transform duration-300 group-hover:translate-x-0.5">
              &#8594;
            </span>
          </span>
        </Link>
      ) : null}

      {/* ---------- Four numbers, each a door to its own page ---------- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {headlines.map((item) => {
          // A number that needs attention is clay, everything else accent.
          let valueColour = 'text-accent';
          if (item.isNegative === true) {
            valueColour = 'text-clay';
          }

          // Either a number that counts up to itself, or plain text.
          let valueContent = item.value;
          if (item.countTo !== undefined) {
            valueContent = <CountUp to={item.countTo} format={item.format} />;
          }

          return (
            <Link
              key={item.label}
              to={item.to}
              className="group rounded-[18px] border border-line bg-surface p-5 shadow-card transition-all duration-300 ease-smooth hover:-translate-y-0.5 hover:border-ink/25 hover:shadow-lift"
            >
              <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">
                {item.label}
              </p>
              <p className={'tnum mt-2.5 font-display text-[28px] leading-none ' + valueColour}>
                {valueContent}
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
          <CoachCard hasDebts={hasDebts} />
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

      {/* ---------- Whether any of it is actually happening ---------- */}
      <div className="mt-6">
        <ConsistencyCard summary={checkinSummary} plannedKeptShare={plannedKeptShare} />
      </div>

      {/* ---------- The long view ---------- */}
      {/*
        A plan that invests nothing has nothing to project, and drawing an
        empty chart under a headline of "₹0" looks like a page that failed
        rather than a deliberate choice. It says what is happening instead, and
        the chart comes back the month the debt does.
      */}
      <div id="future" className="mt-16">
        <Eyebrow>Future you</Eyebrow>

        {monthlyInvestment > 0 ? (
          <>
            <div className="mt-5 flex flex-wrap items-end justify-between gap-5">
              <h2 className="max-w-md font-display text-[clamp(1.7rem,3vw,2.3rem)] leading-[1.1] tracking-[-0.02em]">
                {formatRupees(monthlyInvestment)} a month, for {PROJECTION_YEARS} years.
              </h2>
              <p className="tnum font-display text-[clamp(2rem,4vw,2.8rem)] leading-none text-accent">
                {formatRupees(finalValue, { short: true })}
              </p>
            </div>

            <div className="mt-7">
              <ProjectionChart rows={projectionRows} years={PROJECTION_YEARS} />
            </div>
          </>
        ) : (
          <div className="mt-5 rounded-[26px] border border-line bg-surface p-6 shadow-card sm:p-8">
            <h2 className="max-w-lg font-display text-[clamp(1.5rem,2.6vw,2rem)] leading-[1.15] tracking-[-0.02em]">
              Nothing is being invested this month, and that is the plan.
            </h2>

            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-ink2">
              {noInvestingNote}
            </p>

            <Link to="/plans" className="sweep mt-5 inline-block text-[14px] font-semibold text-ink">
              See what each plan is worth
            </Link>
          </div>
        )}
      </div>

      <p className="mt-14 border-t border-line pt-7 text-2xs text-muted">
        Educational guidance, not regulated investment advice.
      </p>
    </AppShell>
  );
}
