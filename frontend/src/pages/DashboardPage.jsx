import { Navigate } from 'react-router-dom';
import AppShell from '../components/layout/AppShell';
import BriefingCard from '../components/dashboard/BriefingCard';
import CheckInLink from '../components/dashboard/CheckInLink';
import CoachCard from '../components/dashboard/CoachCard';
import ConsistencyCard from '../components/dashboard/ConsistencyCard';
import FollowedPlanBanner from '../components/dashboard/FollowedPlanBanner';
import FutureProjection from '../components/dashboard/FutureProjection';
import HeadlineStats from '../components/dashboard/HeadlineStats';
import OutflowCard from '../components/dashboard/OutflowCard';
import PlanCard from '../components/dashboard/PlanCard';
import PriorityCard from '../components/dashboard/PriorityCard';
import ResilienceCard from '../components/dashboard/ResilienceCard';
import { Skeleton, SkeletonCard, SkeletonScreen, SkeletonStat } from '../components/shared/Skeleton';
import useAsyncData from '../hooks/useAsyncData';
import * as api from '../lib/api';
import { currentMonth, hasCheckinFor, summariseCheckins } from '../lib/checkins';
import { greetingForNow } from '../lib/household';
import { loadFinances } from '../lib/loadFinances';
import { bucketAmount } from '../lib/plan';
import { runStandardShocks } from '../lib/shocks';

/*
  /dashboard: the overview. Every figure comes from shared/finances.js through
  loadFinances, and every section links to the page that owns it.
*/

async function loadDashboard() {
  const [finances, goals, checkins] = await Promise.all([loadFinances(), api.getGoals(), api.getCheckins()]);

  for (const result of [finances, goals, checkins]) {
    if (result.ok === false) {
      return result;
    }
  }

  return {
    ok: true,
    data: { ...finances.data, goals: goals.data.goals, checkins: checkins.data.checkins },
  };
}

/* The share of income the plan keeps, which is what check-ins are compared with. */
function plannedKeptShareOf(plan) {
  if (plan.income <= 0) {
    return 0;
  }

  return ((bucketAmount(plan, 'save') + bucketAmount(plan, 'invest')) / plan.income) * 100;
}

function DashboardLoading({ user, greeting, subtitle }) {
  return (
    <AppShell user={user} title={greeting} subtitle={subtitle}>
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

export default function DashboardPage({ user }) {
  const page = useAsyncData(loadDashboard);

  const thisMonth = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  let greeting = greetingForNow() + '.';
  if (user.name) {
    greeting = greetingForNow() + ', ' + user.name + '.';
  }

  if (page.error) {
    return (
      <div className="grid min-h-screen place-items-center bg-paper px-6">
        <p role="alert" className="max-w-sm text-center text-[14.5px] text-clay">{page.error}</p>
      </div>
    );
  }

  if (page.data === null) {
    return <DashboardLoading user={user} greeting={greeting} subtitle={thisMonth} />;
  }

  // Signed in, but the onboarding questions were never answered.
  if (page.data.finances === null) {
    return <Navigate to="/onboarding" replace />;
  }

  const data = page.data;
  const finances = data.finances;
  const plan = finances.plan;
  const hasDebts = data.debts.length > 0;
  const plannedKeptShare = plannedKeptShareOf(plan);

  return (
    <AppShell
      user={user}
      title={greeting}
      subtitle={thisMonth}
      action={<CheckInLink hasCheckedIn={hasCheckinFor(data.checkins, currentMonth())} />}
    >
      {/* Fetches itself, so a slow first note of the day does not hold the page back. */}
      <BriefingCard />

      <FollowedPlanBanner scenario={finances.followedScenario} />

      <HeadlineStats finances={finances} goals={data.goals} hasDebts={hasDebts} />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <PlanCard plan={plan} />

        <div className="space-y-6">
          <PriorityCard reasoning={plan.reasoning} />
          <CoachCard hasDebts={hasDebts} />
        </div>
      </div>

      <div className="mt-6">
        <ResilienceCard
          summary={runStandardShocks({ finances: finances, family: data.family })}
          familyListed={finances.family.hasList}
        />
      </div>

      <div className="mt-6">
        <OutflowCard
          plan={plan}
          dependents={finances.dependents}
          familyListed={finances.family.hasList}
          hasLoan={hasDebts}
        />
      </div>

      <div className="mt-6">
        <ConsistencyCard summary={summariseCheckins(data.checkins, plannedKeptShare)} plannedKeptShare={plannedKeptShare} />
      </div>

      <FutureProjection
        monthlyInvestment={bucketAmount(plan, 'invest')}
        isFollowingPlan={finances.followedScenario !== null}
      />

      <p className="mt-14 border-t border-line pt-7 text-2xs text-muted">Educational guidance, not regulated investment advice.</p>
    </AppShell>
  );
}
