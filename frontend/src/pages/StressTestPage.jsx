import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import AppShell from '../components/layout/AppShell';
import { PageError, PageLoading } from '../components/layout/PageStatus';
import CashRunway from '../components/charts/CashRunway';
import Card from '../components/shared/Card';
import Overline from '../components/shared/Overline';
import ShockControls from '../components/stressTest/ShockControls';
import ShockMonthTable from '../components/stressTest/ShockMonthTable';
import ShockOutcome from '../components/stressTest/ShockOutcome';
import ShockPicker from '../components/stressTest/ShockPicker';
import { defaultSettings, shockFor } from '../components/stressTest/shockSettings';
import useAsyncData from '../hooks/useAsyncData';
import { loadFinances } from '../lib/loadFinances';
import { CRISIS_SPEND_SHARE, HORIZON_MONTHS, OUT_OF_POCKET_WITH_COVER, SHOCK_TYPES, runShock } from '../lib/shocks';

/*
  /stress-test: what a bad year would do to this household's cash, month by month.

  Every result comes from runShock in shared/shocks.js. The calculation runs in
  the browser so dragging a slider updates instantly; the AI coach runs the same
  function on the server.
*/

const TITLE = 'Stress test';

export default function StressTestPage({ user }) {
  const page = useAsyncData(loadFinances);
  const [selectedType, setSelectedType] = useState('job_loss');

  // Only the values somebody has moved. Anything missing uses the default for
  // this household, which is not known until the data arrives.
  const [changedSettings, setChangedSettings] = useState({});

  if (page.error) {
    return <PageError user={user} title={TITLE} message={page.error} />;
  }

  if (page.data === null) {
    return <PageLoading user={user} title={TITLE} label="Loading your stress test" stats={4} cards={1} />;
  }

  if (page.data.finances === null) {
    return <Navigate to="/onboarding" replace />;
  }

  const finances = page.data.finances;
  const settings = { ...defaultSettings(finances), ...changedSettings };

  // A new object rather than changing the old one, because React only
  // re-renders when it is handed a different object.
  function changeSetting(key, value) {
    const next = { ...changedSettings };
    next[key] = value;
    setChangedSettings(next);
  }

  // Every shock is run with the current sliders, so each tab shows its verdict.
  const results = {};

  SHOCK_TYPES.forEach((type) => {
    results[type] = runShock({ finances: finances, family: page.data.family, shock: shockFor(type, settings) });
  });

  const result = results[selectedType];

  return (
    <AppShell user={user} title={TITLE} subtitle="What a bad year would do to your cash. Change the shock and watch each month.">
      <ShockPicker results={results} selectedType={selectedType} onSelect={setSelectedType} />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card size="panel">
          <p className="text-[15px] leading-relaxed text-ink2">{result.description}</p>

          <div className="mt-6">
            <ShockControls type={selectedType} settings={settings} onChange={changeSetting} />
          </div>

          <div className="mt-8">
            <CashRunway rows={result.rows} />
          </div>
        </Card>

        <ShockOutcome result={result} finances={finances} />
      </div>

      <div className="mt-8 rounded-[22px] border border-line bg-paperDeep p-6">
        <Overline>How this is worked out</Overline>

        <ul className="mt-3 space-y-1.5 text-[13.5px] leading-relaxed text-ink2">
          <li>Starts from cash you can reach quickly: savings accounts and fixed deposits. Funds, gold and property are not counted.</li>
          <li>
            During the shock, investing pauses, extra debt payments pause, and everyday spending drops
            to {Math.round(CRISIS_SPEND_SHARE * 100)}%. Rent, bills, family support and EMIs still go out.
          </li>
          <li>With health cover, you are assumed to pay {Math.round(OUT_OF_POCKET_WITH_COVER * 100)}% of a hospital bill yourself.</li>
          <li>After the shock, each month follows your plan again. The walk covers {HORIZON_MONTHS} months.</li>
        </ul>
      </div>

      <ShockMonthTable rows={result.rows} />

      <p className="mt-14 border-t border-line pt-7 text-2xs text-muted">Educational guidance, not regulated investment advice.</p>
    </AppShell>
  );
}
