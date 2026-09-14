import { useSearchParams } from 'react-router-dom';
import AppShell from '../components/layout/AppShell';
import { PageError, PageLoading } from '../components/layout/PageStatus';
import CheckinForm from '../components/checkIn/CheckinForm';
import CheckinHistory from '../components/checkIn/CheckinHistory';
import HistorySummary from '../components/checkIn/HistorySummary';
import useAsyncData from '../hooks/useAsyncData';
import * as api from '../lib/api';
import { loadFinances } from '../lib/loadFinances';

/*
  /check-in: what really happened in a month, compared with the plan. The
  spending page can link here with the month's figures already in the address,
  as ?month=2026-08&income=85000&spent=64381.
*/

const TITLE = 'Check in';

async function loadCheckInPage() {
  const [checkins, finances, insights] = await Promise.all([api.getCheckins(), loadFinances(), api.getInsights()]);

  for (const result of [checkins, finances, insights]) {
    if (result.ok === false) {
      return result;
    }
  }

  let plan = null;
  if (finances.data.finances !== null) {
    plan = finances.data.finances.plan;
  }

  return {
    ok: true,
    data: { checkins: checkins.data.checkins, plan: plan, insights: insights.data.insights },
  };
}

/* A value from the address, or '' when missing. Only ever used to fill a box. */
function readParam(searchParams, name) {
  const value = searchParams.get(name);

  if (value === null) {
    return '';
  }

  return value;
}

export default function CheckInPage({ user }) {
  const [searchParams] = useSearchParams();
  const page = useAsyncData(loadCheckInPage);

  if (page.error) {
    return <PageError user={user} title={TITLE} message={page.error} />;
  }

  if (page.data === null) {
    return <PageLoading user={user} title={TITLE} label="Loading your check-ins" stats={3} cards={1} />;
  }

  const prefill = {
    month: readParam(searchParams, 'month'),
    income: readParam(searchParams, 'income'),
    spent: readParam(searchParams, 'spent'),
    invested: readParam(searchParams, 'invested'),
  };

  return (
    <AppShell
      user={user}
      title={TITLE}
      subtitle="What actually happened this month. Rough figures are fine, and a missed month is fine too."
    >
      <div className="grid gap-8 lg:grid-cols-[1fr_0.85fr]">
        <CheckinForm plan={page.data.plan} prefill={prefill} onSaved={page.reload} />

        <div>
          <h2 className="font-display text-[26px] leading-tight tracking-[-0.01em]">What has happened</h2>
          <HistorySummary insights={page.data.insights} />
          <CheckinHistory checkins={page.data.checkins} />
        </div>
      </div>
    </AppShell>
  );
}
