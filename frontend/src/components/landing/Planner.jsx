import { useState } from 'react';
import { buildPlan, formatRupees } from '../../lib/plan';

/*
  The planner card in the landing page hero: change the income, dependents or
  loan and the plan recalculates.

  The landing page owns the household and passes it in, because the projection
  further down needs the same numbers ("lifting state up").

    household  the current numbers
    onChange   called with a new household object
*/

// The slider runs between these two salaries.
const LOWEST_INCOME = 20000;
const HIGHEST_INCOME = 250000;

// Colours and one line of explanation for each of the three buckets.
const bucketLooks = {
  spend: { barColour: 'bg-ink/25', dotColour: 'bg-ink/40', note: 'Rent, food, the life you are living now' },
  save: { barColour: 'bg-brass', dotColour: 'bg-brass', note: 'Emergency buffer and near-term goals' },
  invest: { barColour: 'bg-accent', dotColour: 'bg-accent', note: 'Index funds, left alone for a decade' },
};

// Colours for the explanation box at the bottom. buildPlan picks the tone.
const reasoningLooks = {
  accent: 'border-accent/25 bg-accentSoft',
  brass: 'border-brass/25 bg-brassSoft',
  clay: 'border-clay/20 bg-claySoft',
};

export default function Planner({ household, onChange }) {
  // True only while the slider is being dragged, so the card can say "Recalculating".
  const [isDragging, setIsDragging] = useState(false);

  // Run the maths. This happens again on every render, which is fine:
  // it is a handful of additions, far too fast to notice.
  const plan = buildPlan(household);

  // How much of the salary is already claimed, as a percentage. The little bar
  // under "Actually yours to direct" uses this for its width.
  const claimedPercent = ((plan.support + plan.emi) / plan.income) * 100;

  // How far along the slider the handle sits, as a percentage.
  const sliderPercent = ((household.income - LOWEST_INCOME) / (HIGHEST_INCOME - LOWEST_INCOME)) * 100;

  // The living-costs slider stops at 70% of income, the same ceiling the server
  // enforces, so the demo cannot be dragged into a household that spends more
  // than it earns.
  const highestCosts = Math.round(household.income * 0.7);

  let costsSliderPercent = 0;
  if (highestCosts > 0) {
    costsSliderPercent = (household.essentialCosts / highestCosts) * 100;
  }

  // The varying-income switch, worked out here rather than as ternaries inside
  // the markup. Brass rather than clay, because a variable income is a fact to
  // plan around and not a problem the way an expensive debt is.
  let variesSwitchClasses = 'border-line bg-paperDeep';
  let variesKnobClasses = 'translate-x-0';

  if (household.incomeVaries === true) {
    variesSwitchClasses = 'border-brass bg-brass';
    variesKnobClasses = 'translate-x-[20px]';
  }

  // Each handler builds a new household object, because React only re-renders when
  // state is replaced rather than edited.
  const handleIncomeChange = (event) => {
    // input values arrive as text, so convert
    const income = Number(event.target.value);

    // Copies every existing field, so a new field is never dropped by accident, then
    // keeps living costs under the new ceiling.
    const highest = Math.round(income * 0.7);

    let essentialCosts = household.essentialCosts;
    if (essentialCosts > highest) {
      essentialCosts = highest;
    }

    onChange({ ...household, income: income, essentialCosts: essentialCosts });
  };

  const handleCostsChange = (event) => {
    onChange({ ...household, essentialCosts: Number(event.target.value) });
  };

  const handleDependentsChange = (newCount) => {
    onChange({ ...household, dependents: newCount });
  };

  const handleLoanToggle = () => {
    // The ! flips true to false and false to true.
    onChange({ ...household, hasLoan: !household.hasLoan });
  };

  const handleIncomeVariesToggle = () => {
    onChange({ ...household, incomeVaries: !household.incomeVaries });
  };

  // The line under the "actually yours" bar changes depending on the situation.
  let claimedSentence = 'Nothing is claimed on this income yet.';
  if (plan.support + plan.emi > 0) {
    claimedSentence =
      formatRupees(plan.support + plan.emi)
      + ' leaves for household support and EMI before you decide anything.';
  }

  let statusText = 'Updated just now';
  if (isDragging === true) {
    statusText = 'Recalculating';
  }

  return (
    <div className="relative">
      {/* A second sheet peeking out behind the card, so it feels like a real object. */}
      <div
        className="absolute -inset-x-4 top-5 -z-10 h-[calc(100%-1rem)] rounded-4xl border border-line/60 bg-surface/40"
        aria-hidden="true"
      />

      <div className="overflow-hidden rounded-[26px] border border-line bg-surface shadow-float">

        {/* ---------- Card header ---------- */}
        <div className="flex items-center justify-between border-b border-lineSoft px-6 py-3.5">
          <span className="flex items-center gap-2.5 text-2xs font-semibold uppercase tracking-widest2 text-muted">
            {/* Two circles stacked: one still, one growing and fading, to make a pulse. */}
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-accent animate-ping2" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
            Live plan
          </span>
          <span className="text-2xs font-medium text-muted">{statusText}</span>
        </div>

        {/* ---------- The three controls ---------- */}
        <div className="space-y-4 px-6 py-5">

          {/* Income slider */}
          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="income" className="text-[13px] font-medium text-ink2">
                Monthly income
              </label>
              {/* "tnum" makes every digit the same width, so the number does not
                  jiggle sideways while you drag. */}
              <span className="tnum font-display text-[26px] leading-none">
                {formatRupees(household.income)}
              </span>
            </div>

            <input
              id="income"
              type="range"
              min={LOWEST_INCOME}
              max={HIGHEST_INCOME}
              step={1000}
              value={household.income}
              onChange={handleIncomeChange}
              onPointerDown={() => setIsDragging(true)}
              onPointerUp={() => setIsDragging(false)}
              onBlur={() => setIsDragging(false)}
              // The filled green part of the track is a background image whose
              // width we set here. The rest of the styling is in global.css.
              style={{ backgroundSize: sliderPercent + '% 100%' }}
              className="range-track mt-3.5"
            />

            <div className="mt-2 flex justify-between text-2xs text-muted">
              <span>₹20k</span>
              <span>₹2.5L</span>
            </div>
          </div>

          {/* Rent, food and bills */}
          <div className="border-t border-lineSoft pt-4">
            <div className="flex items-baseline justify-between">
              <label htmlFor="costs" className="text-[13px] font-medium text-ink2">
                Rent, food and bills
              </label>
              <span className="tnum font-display text-[20px] leading-none">
                {formatRupees(household.essentialCosts)}
              </span>
            </div>

            <input
              id="costs"
              type="range"
              min={0}
              max={highestCosts}
              step={500}
              value={household.essentialCosts}
              onChange={handleCostsChange}
              style={{ backgroundSize: costsSliderPercent + '% 100%' }}
              className="range-track mt-3"
            />
          </div>

          {/* Dependents: four round buttons, 0 to 3 */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-lineSoft pt-4">
            <span className="text-[13px] font-medium text-ink2">People you support</span>

            <div className="flex gap-1.5">
              {[0, 1, 2, 3].map((count) => {
                const isChosen = household.dependents === count;

                // Build the class list step by step instead of cramming it into
                // one long line, so it stays readable.
                let buttonClasses =
                  'h-9 w-9 rounded-full border text-[13px] font-semibold transition-all duration-300 ease-smooth ';

                if (isChosen === true) {
                  buttonClasses = buttonClasses + 'border-ink bg-ink text-paper';
                } else {
                  buttonClasses = buttonClasses + 'border-line text-muted hover:border-ink hover:text-ink';
                }

                return (
                  <button
                    key={count}
                    type="button"
                    onClick={() => handleDependentsChange(count)}
                    aria-pressed={isChosen}
                    className={buttonClasses}
                  >
                    {count}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Education loan on/off switch */}
          <div className="flex items-center justify-between border-t border-lineSoft pt-4">
            <span className="text-[13px] font-medium text-ink2">Education loan running</span>

            <button
              type="button"
              role="switch"
              aria-checked={household.hasLoan}
              onClick={handleLoanToggle}
              className={
                'relative h-7 w-12 rounded-full border transition-colors duration-300 '
                + (household.hasLoan ? 'border-clay bg-clay' : 'border-line bg-paperDeep')
              }
            >
              {/* Screen readers need words, not a coloured pill. */}
              <span className="sr-only">Toggle education loan</span>

              {/* The white knob. It has an explicit "left" because an absolutely
                  positioned child of a centred button would otherwise start in
                  the middle rather than at the edge. */}
              <span
                className={
                  'absolute left-[3px] top-[3px] h-5 w-5 rounded-full bg-surface shadow-sm '
                  + 'transition-transform duration-300 ease-smooth '
                  + (household.hasLoan ? 'translate-x-[20px]' : 'translate-x-0')
                }
              />
            </button>
          </div>

          {/* Does the income move about? */}
          <div className="flex items-center justify-between border-t border-lineSoft pt-4">
            <span className="text-[13px] font-medium text-ink2">Income varies each month</span>

            <button
              type="button"
              role="switch"
              aria-checked={household.incomeVaries}
              onClick={handleIncomeVariesToggle}
              className={
                'relative h-7 w-12 rounded-full border transition-colors duration-300 '
                + variesSwitchClasses
              }
            >
              <span className="sr-only">Toggle varying income</span>

              <span
                className={
                  'absolute left-[3px] top-[3px] h-5 w-5 rounded-full bg-surface shadow-sm '
                  + 'transition-transform duration-300 ease-smooth '
                  + variesKnobClasses
                }
              />
            </button>
          </div>
        </div>

        {/* ---------- What is actually left ---------- */}
        <div className="border-y border-lineSoft bg-paper/70 px-6 py-4">
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] font-medium text-ink2">Actually yours to direct</span>
            <span className="tnum font-display text-[26px] leading-none text-accent">
              {formatRupees(plan.free)}
            </span>
          </div>

          {/* A green bar with a grey section on the left showing the claimed part. */}
          <div className="mt-3.5 flex h-1.5 overflow-hidden rounded-full bg-accent/25">
            <div
              className="h-full bg-ink/20 transition-[width] duration-700 ease-smooth"
              style={{ width: claimedPercent + '%' }}
            />
          </div>

          <p className="mt-2.5 text-2xs text-muted">{claimedSentence}</p>
        </div>

        {/* ---------- The three-way split ---------- */}
        <div className="space-y-3 px-6 py-5">

          {/* One bar made of three coloured pieces sitting side by side. */}
          <div className="flex h-2 overflow-hidden rounded-full bg-paperDeep">
            {plan.buckets.map((bucket) => {
              return (
                <div
                  key={bucket.key}
                  className={
                    'h-full transition-[width] duration-700 ease-smooth '
                    + bucketLooks[bucket.key].barColour
                  }
                  style={{ width: bucket.percent + '%' }}
                />
              );
            })}
          </div>

          {/* One row per bucket: name and note on the left, money on the right. */}
          {plan.buckets.map((bucket) => {
            const look = bucketLooks[bucket.key];

            // While a loan is running, part of the Save bucket is really going
            // at the loan, so say that instead of the usual note.
            let note = look.note;
            if (bucket.key === 'save' && household.hasLoan === true) {
              note = 'Buffer, plus everything spare thrown at the loan';
            }

            return (
              <div
                key={bucket.key}
                className="flex items-center justify-between gap-4 border-b border-lineSoft pb-2.5 last:border-0 last:pb-0"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className={'h-1.5 w-1.5 shrink-0 rounded-full ' + look.dotColour} />
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold text-ink">{bucket.label}</p>
                    <p className="truncate text-2xs text-muted">{note}</p>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <span className="tnum block text-[15px] font-semibold text-ink">
                    {formatRupees(bucket.amount)}
                  </span>
                  <span className="tnum text-2xs text-muted">{bucket.percent}%</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ---------- Why the plan looks like this ---------- */}
        <div className="px-6 pb-5">
          <div
            className={
              'rounded-2xl border p-3.5 transition-colors duration-500 '
              + reasoningLooks[plan.reasoning.tone]
            }
          >
            <p className="text-2xs font-semibold uppercase tracking-widest2 text-ink2">
              {plan.reasoning.label}
            </p>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink2">{plan.reasoning.text}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
