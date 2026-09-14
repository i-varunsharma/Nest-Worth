import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import AppShell from '../components/app/AppShell';
import CashRunway from '../components/charts/CashRunway';
import SliderField from '../components/shared/SliderField';
import { SkeletonPage } from '../components/shared/Skeleton';
import { bucketAmount, formatRupees } from '../lib/plan';
import { loadFinances } from '../lib/loadFinances';
import {
  CRISIS_SPEND_SHARE,
  HORIZON_MONTHS,
  OUT_OF_POCKET_WITH_COVER,
  SHOCK_TYPES,
  runShock,
  shockTitle,
  standardShocks,
  verdictSentence,
} from '../lib/shocks';

/*
  The screen at /stress-test. What happens to this household's cash if
  something goes wrong, month by month for a year.

  Every result comes from runShock in shared/shocks.js. This page only holds
  the slider values and draws what comes back. The calculation runs in the
  browser rather than on the server so dragging a slider updates instantly; the
  AI coach runs the same function on the server.

  Props:
    user - the signed-in person, handed down by RequireAuth
*/

// Slider limits. The shared code clamps too, these just keep the slider sensible.
const MAX_MONTHS = 12;
const MAX_MEDICAL_BILL = 2000000;
const MEDICAL_STEP = 25000;
const MAX_FAMILY_EXTRA = 100000;
const FAMILY_STEP = 1000;

const verdictLooks = {
  safe: { dot: 'bg-accent', box: 'border-accent/25 bg-accentSoft', word: 'Gets through' },
  tight: { dot: 'bg-brass', box: 'border-brass/25 bg-brassSoft', word: 'Only just' },
  breaks: { dot: 'bg-clay', box: 'border-clay/25 bg-claySoft', word: 'Runs out' },
};


/* The starting slider values, taken from the four standard shocks. */
function settingsFromDefaults(finances) {
  const defaults = standardShocks(finances);

  return {
    jobMonths: defaults[0].months,
    cutPercent: defaults[1].percent,
    cutMonths: defaults[1].months,
    medicalAmount: defaults[2].amount,
    familyExtra: defaults[3].extraPerMonth,
    familyMonths: defaults[3].months,
  };
}


/* Turns the slider values into the shock shape shared/shocks.js expects. */
function shockFor(type, settings) {
  if (type === 'job_loss') {
    return { type: 'job_loss', months: settings.jobMonths };
  }
  if (type === 'income_cut') {
    return { type: 'income_cut', percent: settings.cutPercent, months: settings.cutMonths };
  }
  if (type === 'medical') {
    return { type: 'medical', amount: settings.medicalAmount };
  }
  return { type: 'family_support', extraPerMonth: settings.familyExtra, months: settings.familyMonths };
}


function monthsText(months) {
  if (months === 1) {
    return '1 month';
  }
  return months + ' months';
}


export default function StressTestPage({ user }) {
  const [loaded, setLoaded] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [selectedType, setSelectedType] = useState('job_loss');

  // Null until the data arrives, because the defaults depend on the income.
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    let stillMounted = true;

    loadFinances().then((result) => {
      if (stillMounted === false) {
        return;
      }

      if (result.ok === false) {
        setLoadError(result.error);
        return;
      }

      setLoaded(result);

      if (result.finances !== null) {
        setSettings(settingsFromDefaults(result.finances));
      }
    });

    return () => {
      stillMounted = false;
    };
  }, []);

  if (loadError) {
    return (
      <AppShell user={user} title="Stress test">
        <p className="text-[14.5px] text-clay">{loadError}</p>
      </AppShell>
    );
  }

  if (loaded === null) {
    return (
      <AppShell user={user} title="Stress test">
        <SkeletonPage label="Loading your stress test" stats={4} cards={1} />
      </AppShell>
    );
  }

  if (loaded.finances === null) {
    return <Navigate to="/onboarding" replace />;
  }

  // Set in the same update as loaded, so this is a guard rather than a real state.
  if (settings === null) {
    return null;
  }

  const finances = loaded.finances;

  /*
    Changes one slider value. A new object is made rather than editing the old
    one, because React only re-renders when it is handed a different object.
  */
  function updateSetting(key, value) {
    const next = { ...settings };
    next[key] = value;
    setSettings(next);
  }

  // Run all four with the current sliders, so every tab can show its verdict.
  const results = {};

  SHOCK_TYPES.forEach((type) => {
    results[type] = runShock({
      finances: finances,
      family: loaded.family,
      shock: shockFor(type, settings),
    });
  });

  const result = results[selectedType];
  const looks = verdictLooks[result.verdict];

  // ---------------------------------------------------------------
  // The sliders for the selected shock.
  // ---------------------------------------------------------------

  let controls = null;

  if (selectedType === 'job_loss') {
    controls = (
      <SliderField
        id="job-months"
        label="How long without income"
        value={settings.jobMonths}
        valueText={monthsText(settings.jobMonths)}
        min={1}
        max={MAX_MONTHS}
        step={1}
        onChange={(value) => updateSetting('jobMonths', value)}
      />
    );
  } else if (selectedType === 'income_cut') {
    controls = (
      <div className="grid gap-6 sm:grid-cols-2">
        <SliderField
          id="cut-percent"
          label="How much it falls"
          value={settings.cutPercent}
          valueText={settings.cutPercent + '%'}
          min={5}
          max={90}
          step={5}
          onChange={(value) => updateSetting('cutPercent', value)}
        />
        <SliderField
          id="cut-months"
          label="For how long"
          value={settings.cutMonths}
          valueText={monthsText(settings.cutMonths)}
          min={1}
          max={MAX_MONTHS}
          step={1}
          onChange={(value) => updateSetting('cutMonths', value)}
        />
      </div>
    );
  } else if (selectedType === 'medical') {
    controls = (
      <SliderField
        id="medical-amount"
        label="The hospital bill"
        value={settings.medicalAmount}
        valueText={formatRupees(settings.medicalAmount)}
        min={0}
        max={MAX_MEDICAL_BILL}
        step={MEDICAL_STEP}
        onChange={(value) => updateSetting('medicalAmount', value)}
      />
    );
  } else {
    controls = (
      <div className="grid gap-6 sm:grid-cols-2">
        <SliderField
          id="family-extra"
          label="Extra needed each month"
          value={settings.familyExtra}
          valueText={formatRupees(settings.familyExtra)}
          min={0}
          max={MAX_FAMILY_EXTRA}
          step={FAMILY_STEP}
          onChange={(value) => updateSetting('familyExtra', value)}
        />
        <SliderField
          id="family-months"
          label="For how long"
          value={settings.familyMonths}
          valueText={monthsText(settings.familyMonths)}
          min={1}
          max={MAX_MONTHS}
          step={1}
          onChange={(value) => updateSetting('familyMonths', value)}
        />
      </div>
    );
  }

  // ---------------------------------------------------------------
  // What would help. Only suggestions that come from the numbers.
  // ---------------------------------------------------------------

  const suggestions = [];

  if (result.shortfall > 0) {
    let text = 'Build ' + formatRupees(result.shortfall) + ' more in savings or a fixed deposit.';

    if (result.monthsToFix !== null) {
      text = text + ' Your plan saves ' + formatRupees(bucketAmount(finances.plan, 'save'))
        + ' a month, so that takes about ' + monthsText(result.monthsToFix) + '.';
    }

    suggestions.push({ key: 'buffer', text: text, link: '/plans', linkText: 'See the safety net plan' });
  }

  if (selectedType === 'medical' && finances.family.withoutCover.length > 0) {
    suggestions.push({
      key: 'cover',
      text: 'Health cover for ' + finances.family.withoutCover[0].name + ' would turn most of this bill '
        + 'into a premium you can plan for.',
      link: '/family',
      linkText: 'Update the family page',
    });
  }

  if (selectedType === 'medical' && finances.family.hasList === false) {
    suggestions.push({
      key: 'family',
      text: 'Add the people you support so this test knows who has health cover.',
      link: '/family',
      linkText: 'Add your family',
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      key: 'fine',
      text: 'Nothing to fix for this one. Try making it longer or larger to find where it starts to hurt.',
      link: null,
      linkText: '',
    });
  }

  // The four numbers under the verdict.
  let lowestNote = 'at month ' + result.lowestMonth;
  if (result.lowestMonth === 0) {
    lowestNote = 'today, it only grows from here';
  }

  let lowestColour = 'text-ink';
  if (result.lowestCash < 0) {
    lowestColour = 'text-clay';
  }

  return (
    <AppShell
      user={user}
      title="Stress test"
      subtitle="What a bad year would do to your cash. Change the shock and watch each month."
    >

      {/* ---------- Pick a shock ---------- */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="tablist" aria-label="Shocks">
        {SHOCK_TYPES.map((type) => {
          const isSelected = type === selectedType;
          const tabLooks = verdictLooks[results[type].verdict];

          let tabClasses = 'rounded-[18px] border bg-surface p-4 text-left transition-all duration-300 ease-smooth ';
          if (isSelected === true) {
            tabClasses = tabClasses + 'border-ink shadow-lift';
          } else {
            tabClasses = tabClasses + 'border-line hover:border-ink/40';
          }

          return (
            <button
              key={type}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setSelectedType(type)}
              className={tabClasses}
            >
              <span className="block text-[15px] font-semibold text-ink">{shockTitle(type)}</span>
              <span className="mt-1.5 flex items-center gap-2 text-2xs text-muted">
                <span aria-hidden="true" className={'h-2 w-2 rounded-full ' + tabLooks.dot} />
                {tabLooks.word}
              </span>
            </button>
          );
        })}
      </div>

      {/* ---------- The shock and its verdict ---------- */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[26px] border border-line bg-surface p-6 shadow-card sm:p-8">
          <p className="text-[15px] leading-relaxed text-ink2">{result.description}</p>

          <div className="mt-6">{controls}</div>

          <div className="mt-8">
            <CashRunway rows={result.rows} />
          </div>
        </div>

        <div className="space-y-6">
          <div className={'rounded-[26px] border p-6 sm:p-7 ' + looks.box}>
            <p className="flex items-center gap-2.5 text-2xs font-semibold uppercase tracking-widest2 text-ink2">
              <span aria-hidden="true" className={'h-1.5 w-1.5 rounded-full ' + looks.dot} />
              {looks.word}
            </p>
            <p className="mt-4 text-[15.5px] leading-relaxed text-ink">{verdictSentence(result)}</p>
          </div>

          <dl className="grid grid-cols-2 gap-4 rounded-[26px] border border-line bg-surface p-6 shadow-card">
            <div>
              <dt className="text-2xs font-semibold uppercase tracking-widest2 text-muted">Cash today</dt>
              <dd className="tnum mt-1.5 font-display text-[22px] leading-none">
                {formatRupees(result.startCash, { short: true })}
              </dd>
            </div>

            <div>
              <dt className="text-2xs font-semibold uppercase tracking-widest2 text-muted">Lowest point</dt>
              <dd className={'tnum mt-1.5 font-display text-[22px] leading-none ' + lowestColour}>
                {formatRupees(result.lowestCash, { short: true })}
              </dd>
              <dd className="mt-1 text-2xs text-muted">{lowestNote}</dd>
            </div>

            <div>
              <dt className="text-2xs font-semibold uppercase tracking-widest2 text-muted">After a year</dt>
              <dd className="tnum mt-1.5 font-display text-[22px] leading-none">
                {formatRupees(result.endCash, { short: true })}
              </dd>
            </div>

            <div>
              <dt className="text-2xs font-semibold uppercase tracking-widest2 text-muted">A month costs</dt>
              <dd className="tnum mt-1.5 font-display text-[22px] leading-none">
                {formatRupees(finances.monthlyCosts, { short: true })}
              </dd>
            </div>
          </dl>

          <div className="rounded-[26px] border border-line bg-surface p-6 shadow-card">
            <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">What would help</p>

            <ul className="mt-4 space-y-4">
              {suggestions.map((suggestion) => {
                return (
                  <li key={suggestion.key} className="text-[14px] leading-relaxed text-ink2">
                    {suggestion.text}
                    {suggestion.link !== null ? (
                      <Link to={suggestion.link} className="sweep ml-1.5 font-semibold text-ink">
                        {suggestion.linkText}
                      </Link>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      {/* ---------- The assumptions, stated ---------- */}
      <div className="mt-8 rounded-[22px] border border-line bg-paperDeep p-6">
        <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">How this is worked out</p>

        <ul className="mt-3 space-y-1.5 text-[13.5px] leading-relaxed text-ink2">
          <li>Starts from cash you can reach quickly: savings accounts and fixed deposits. Funds, gold and property are not counted.</li>
          <li>
            During the shock, investing pauses, extra debt payments pause, and everyday spending drops
            to {Math.round(CRISIS_SPEND_SHARE * 100)}%. Rent, bills, family support and EMIs still go out.
          </li>
          <li>
            With health cover, you are assumed to pay {Math.round(OUT_OF_POCKET_WITH_COVER * 100)}% of a hospital
            bill yourself.
          </li>
          <li>After the shock, each month follows your plan again. The walk covers {HORIZON_MONTHS} months.</li>
        </ul>
      </div>

      {/* ---------- Every figure, as a table ---------- */}
      <details className="mt-6 rounded-[22px] border border-line bg-surface p-6">
        <summary className="cursor-pointer text-[14px] font-semibold text-ink">Every month as a table</summary>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-[13.5px]">
            <thead>
              <tr className="border-b border-line text-2xs uppercase tracking-widest2 text-muted">
                <th className="py-2 pr-4 font-semibold">Month</th>
                <th className="py-2 pr-4 font-semibold">Cash at the end</th>
                <th className="py-2 font-semibold">During the shock</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row) => {
                let monthLabel = 'Month ' + row.month;
                if (row.month === 0) {
                  monthLabel = 'Today';
                }

                let crisisText = '';
                if (row.isCrisis === true) {
                  crisisText = 'Yes';
                }

                let cashClasses = 'tnum py-2 pr-4 text-ink';
                if (row.cash < 0) {
                  cashClasses = 'tnum py-2 pr-4 font-semibold text-clay';
                }

                return (
                  <tr key={row.month} className="border-b border-lineSoft last:border-0">
                    <td className="py-2 pr-4 text-ink2">{monthLabel}</td>
                    <td className={cashClasses}>{formatRupees(row.cash)}</td>
                    <td className="py-2 text-ink2">{crisisText}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>

      <p className="mt-14 border-t border-line pt-7 text-2xs text-muted">
        Educational guidance, not regulated investment advice.
      </p>
    </AppShell>
  );
}
