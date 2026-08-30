import { useState } from 'react';
import { extraPaymentEffect, formatDuration, formatMonthYear, payoff } from '../../lib/debt';
import { formatRupees } from '../../lib/plan';
import { labelForKind } from '../../lib/networth';
import { DEBT_KINDS } from '../../lib/networth';

/*
  DebtCard
  --------
  One debt, with everything worth knowing about it.

  The slider at the bottom is the point of this whole screen. "Your loan charges
  11.2%" is a fact nobody acts on. "Put ₹3,000 more in each month and you are
  free seventeen months sooner and ₹37,800 better off" is a decision somebody
  can actually make on a Tuesday evening.

  Props:
    debt      - { id, name, kind, principal, annualRate, emi }
    isPriority- true for the highest-rate debt, which gets a marker
    onEdit    - open the edit form
    onDelete  - remove it
*/

// The slider for the extra monthly payment runs from nothing to this.
const MAX_EXTRA = 20000;

export default function DebtCard({ debt, isPriority, onEdit, onDelete }) {
  const [extra, setExtra] = useState(0);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const base = payoff(debt.principal, debt.annualRate, debt.emi, 0);
  const effect = extraPaymentEffect(debt.principal, debt.annualRate, debt.emi, extra);

  const sliderPercent = (extra / MAX_EXTRA) * 100;

  return (
    <article className="rounded-[22px] border border-line bg-surface p-6 shadow-card sm:p-7">

      {/* ---------- Heading ---------- */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="font-display text-[24px] leading-tight tracking-[-0.01em]">
              {debt.name}
            </h3>

            {isPriority === true ? (
              <span className="rounded-full border border-clay/25 bg-claySoft px-2.5 py-1 text-2xs font-semibold uppercase tracking-widest2 text-clay">
                Clear this first
              </span>
            ) : null}
          </div>

          <p className="mt-1.5 text-[13px] text-muted">
            {labelForKind(DEBT_KINDS, debt.kind)}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onEdit}
            className="sweep text-[13px] font-medium text-muted transition-colors hover:text-ink"
          >
            Edit
          </button>

          {/* Deleting asks first. A list of debts is not something to lose to a
              stray click, and an undo would be more machinery than this needs. */}
          {isConfirmingDelete === true ? (
            <>
              <button
                type="button"
                onClick={onDelete}
                className="text-[13px] font-semibold text-clay transition-colors hover:underline"
              >
                Really delete
              </button>
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                className="text-[13px] font-medium text-muted transition-colors hover:text-ink"
              >
                Keep
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsConfirmingDelete(true)}
              className="sweep text-[13px] font-medium text-muted transition-colors hover:text-clay"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* ---------- The four numbers ---------- */}
      <div className="mt-6 grid gap-5 border-y border-lineSoft py-5 sm:grid-cols-4">
        <div>
          <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">Still owed</p>
          <p className="tnum mt-1.5 font-display text-[22px] leading-none">
            {formatRupees(debt.principal)}
          </p>
        </div>

        <div>
          <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">Rate</p>
          <p className="tnum mt-1.5 font-display text-[22px] leading-none">
            {debt.annualRate}%
          </p>
        </div>

        <div>
          <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">EMI</p>
          <p className="tnum mt-1.5 font-display text-[22px] leading-none">
            {formatRupees(debt.emi)}
          </p>
        </div>

        <div>
          <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">Clear by</p>
          <p className="tnum mt-1.5 font-display text-[22px] leading-none text-accent">
            {formatMonthYear(base.payoffDate)}
          </p>
        </div>
      </div>

      {/* ---------- What it costs as things stand ---------- */}
      <p className="mt-5 text-[14px] leading-relaxed text-ink2">
        {formatDuration(base.months)} left. If nothing changes you will pay{' '}
        <span className="tnum font-semibold text-ink">{formatRupees(base.totalInterest)}</span>{' '}
        in interest, on top of the {formatRupees(debt.principal)} you owe.
      </p>

      {/* ---------- The extra payment slider ---------- */}
      <div className="mt-7 rounded-xl border border-line bg-paperDeep p-5">
        <div className="flex items-baseline justify-between">
          <label htmlFor={'extra-' + debt.id} className="text-[13px] font-medium text-ink2">
            What if you paid extra each month?
          </label>
          <span className="tnum font-display text-[22px] leading-none">
            {formatRupees(extra)}
          </span>
        </div>

        <input
          id={'extra-' + debt.id}
          type="range"
          min={0}
          max={MAX_EXTRA}
          step={500}
          value={extra}
          onChange={(event) => setExtra(Number(event.target.value))}
          style={{ backgroundSize: sliderPercent + '% 100%' }}
          className="range-track mt-4"
        />

        {/* The answer. It only appears once the slider has been moved, because
            "you would save 0 months" is noise. */}
        {extra > 0 && effect.possible === true ? (
          <div className="mt-5 grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
            <div>
              <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">
                Free sooner by
              </p>
              <p className="tnum mt-1.5 font-display text-[26px] leading-none text-accent">
                {formatDuration(effect.monthsSaved)}
              </p>
              <p className="mt-1.5 text-2xs text-muted">
                {formatMonthYear(effect.newPayoffDate)} instead
              </p>
            </div>

            <div>
              <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">
                Interest saved
              </p>
              <p className="tnum mt-1.5 font-display text-[26px] leading-none text-accent">
                {formatRupees(effect.interestSaved)}
              </p>
              <p className="mt-1.5 text-2xs text-muted">
                money that stays yours
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-2xs text-muted">
            Drag it to see what a little more each month is worth.
          </p>
        )}
      </div>
    </article>
  );
}
