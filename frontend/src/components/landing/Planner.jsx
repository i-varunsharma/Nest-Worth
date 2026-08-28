import { useMemo, useState } from 'react';
import useCountUp from '../../hooks/useCountUp';
import { buildPlan, defaultPlanState, formatRupees } from '../../lib/plan';

function Amount({ value, compact = false, className = '' }) {
  const animated = useCountUp(value, { duration: 650 });
  return <span className={`tnum ${className}`}>{formatRupees(animated, { compact })}</span>;
}

const bucketStyles = {
  spend: { bar: 'bg-ink/25', dot: 'bg-ink/40', note: 'Rent, food, the life you are living now' },
  save: { bar: 'bg-brass', dot: 'bg-brass', note: 'Emergency buffer and near-term goals' },
  invest: { bar: 'bg-accent', dot: 'bg-accent', note: 'Index funds, left alone for a decade' },
};

const toneStyles = {
  accent: 'border-accent/25 bg-accentSoft text-accentDeep',
  brass: 'border-brass/25 bg-brassSoft text-brass',
  clay: 'border-clay/20 bg-claySoft text-clay',
};

function noteFor(key, state) {
  if (key === 'save' && state.hasLoan) return 'Buffer, plus everything spare thrown at the loan';
  return bucketStyles[key].note;
}

export default function Planner({ state = defaultPlanState, onChange = () => {} }) {
  const [dragging, setDragging] = useState(false);
  const plan = useMemo(() => buildPlan(state), [state]);
  const claimed = plan.income > 0 ? ((plan.support + plan.emi) / plan.income) * 100 : 0;
  const sliderFill = ((state.income - 20000) / (250000 - 20000)) * 100;

  return (
    <div className="relative">
      {/* A single sheet behind the card, so it reads as a physical object */}
      <div className="absolute -inset-x-4 top-5 -z-10 h-[calc(100%-1rem)] rounded-4xl border border-line/60 bg-surface/40" aria-hidden="true" />

      <div className="overflow-hidden rounded-[26px] border border-line bg-surface shadow-float">
        <div className="flex items-center justify-between border-b border-lineSoft px-6 py-3.5">
          <span className="flex items-center gap-2.5 text-2xs font-semibold uppercase tracking-widest2 text-muted">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-accent animate-ping2" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
            Live plan
          </span>
          <span className="text-2xs font-medium text-muted">
            {dragging ? 'Recalculating' : 'Updated just now'}
          </span>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="income" className="text-[13px] font-medium text-ink2">Monthly income</label>
              <Amount value={state.income} className="font-display text-[26px] leading-none" />
            </div>
            <input
              id="income"
              type="range"
              min={20000}
              max={250000}
              step={1000}
              value={state.income}
              onChange={(event) => onChange({ ...state, income: Number(event.target.value) })}
              onPointerDown={() => setDragging(true)}
              onPointerUp={() => setDragging(false)}
              onBlur={() => setDragging(false)}
              style={{ backgroundSize: `${sliderFill}% 100%` }}
              className="range-track mt-3.5"
            />
            <div className="mt-2 flex justify-between text-2xs text-muted"><span>₹20k</span><span>₹2.5L</span></div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-lineSoft pt-4">
            <span className="text-[13px] font-medium text-ink2">People you support</span>
            <div className="flex gap-1.5">
              {[0, 1, 2, 3].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => onChange({ ...state, dependents: count })}
                  aria-pressed={state.dependents === count}
                  className={`h-9 w-9 rounded-full border text-[13px] font-semibold transition-all duration-300 ease-smooth ${
                    state.dependents === count
                      ? 'border-ink bg-ink text-paper'
                      : 'border-line text-muted hover:border-ink hover:text-ink'
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-lineSoft pt-4">
            <span className="text-[13px] font-medium text-ink2">Education loan running</span>
            <button
              type="button"
              role="switch"
              aria-checked={state.hasLoan}
              onClick={() => onChange({ ...state, hasLoan: !state.hasLoan })}
              className={`relative h-7 w-12 rounded-full border transition-colors duration-300 ${
                state.hasLoan ? 'border-clay bg-clay' : 'border-line bg-paperDeep'
              }`}
            >
              <span className="sr-only">Toggle education loan</span>
              {/* Explicit left: an absolute child of a centered button otherwise
                  takes its static position from the text-align, not the edge. */}
              <span
                className={`absolute left-[3px] top-[3px] h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-300 ease-smooth ${
                  state.hasLoan ? 'translate-x-[20px]' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="border-y border-lineSoft bg-paper/70 px-6 py-4">
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] font-medium text-ink2">Actually yours to direct</span>
            <Amount value={plan.free} className="font-display text-[26px] leading-none text-accent" />
          </div>
          <div className="mt-3.5 flex h-1.5 overflow-hidden rounded-full bg-accent/25">
            <div
              className="h-full bg-ink/20 transition-[width] duration-700 ease-smooth"
              style={{ width: `${claimed}%` }}
            />
          </div>
          <p className="mt-2.5 text-2xs text-muted">
            {plan.support + plan.emi > 0
              ? `${formatRupees(plan.support + plan.emi)} leaves for household support and EMI before you decide anything.`
              : 'Nothing is claimed on this income yet.'}
          </p>
        </div>

        <div className="space-y-3 px-6 py-5">
          <div className="flex h-2 overflow-hidden rounded-full bg-paperDeep">
            {plan.buckets.map((bucket) => (
              <div
                key={bucket.key}
                className={`h-full transition-[width] duration-700 ease-smooth ${bucketStyles[bucket.key].bar}`}
                style={{ width: `${bucket.share}%` }}
              />
            ))}
          </div>

          {plan.buckets.map((bucket) => (
            <div key={bucket.key} className="flex items-center justify-between gap-4 border-b border-lineSoft pb-2.5 last:border-0 last:pb-0">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${bucketStyles[bucket.key].dot}`} />
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold text-ink">{bucket.label}</p>
                  <p className="truncate text-2xs text-muted">{noteFor(bucket.key, state)}</p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <Amount value={bucket.amount} className="block text-[15px] font-semibold text-ink" />
                <span className="tnum text-2xs text-muted">{bucket.share}%</span>
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 pb-5">
          <div className={`rounded-2xl border p-3.5 transition-colors duration-500 ${toneStyles[plan.reasoning.tone]}`}>
            <p className="text-2xs font-semibold uppercase tracking-widest2">{plan.reasoning.label}</p>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink2">{plan.reasoning.body}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
