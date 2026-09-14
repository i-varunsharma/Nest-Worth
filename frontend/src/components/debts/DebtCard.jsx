import { useState } from 'react';
import Card from '../shared/Card';
import RecordActions from '../shared/RecordActions';
import StatTile from '../shared/StatTile';
import { extraPaymentEffect, formatDuration, formatMonthYear, payoff } from '../../lib/debt';
import { formatRupees } from '../../lib/plan';
import { DEBT_KINDS, labelForKind } from '../../lib/networth';

/*
  One debt, with a slider showing what paying extra each month would change.

  Props:
    debt        { id, name, kind, principal, annualRate, emi }
    isPriority  true for the highest-rate debt
    onEdit, onDelete
*/

// The slider for the extra monthly payment runs from nothing to this.
const MAX_EXTRA = 20000;

export default function DebtCard({ debt, isPriority, onEdit, onDelete }) {
  const [extra, setExtra] = useState(0);

  const base = payoff(debt.principal, debt.annualRate, debt.emi, 0);
  const effect = extraPaymentEffect(debt.principal, debt.annualRate, debt.emi, extra);

  const sliderPercent = (extra / MAX_EXTRA) * 100;

  // When the debt never clears, payoff() returns zeros for months and interest.
  // Those must not be printed as if they were real figures.
  const clears = base.clears === true;

  let clearByText = formatMonthYear(base.payoffDate);
  let costLine = null;

  if (clears === true) {
    costLine = (
      <>
        {formatDuration(base.months)} left. If nothing changes you will pay{' '}
        <span className="tnum font-semibold text-ink">{formatRupees(base.totalInterest)}</span>{' '}
        in interest, on top of the {formatRupees(debt.principal)} you owe.
      </>
    );
  } else if (base.reason === 'interest') {
    clearByText = 'Never';
    costLine = (
      <>
        The EMI is smaller than the interest, so this balance grows every month
        rather than shrinking. Raising the EMI above{' '}
        <span className="tnum font-semibold text-ink">
          {formatRupees(debt.emi + base.shortfall)}
        </span>{' '}
        is what turns it around.
      </>
    );
  } else {
    clearByText = '50+ yrs';
    costLine = (
      <>
        The EMI only just covers the interest, so after fifty years there would
        still be{' '}
        <span className="tnum font-semibold text-ink">
          {formatRupees(base.remainingAfterCap)}
        </span>{' '}
        owing. A small increase changes this enormously.
      </>
    );
  }

  // The "Clear by" figure is green when there is a date and clay when there
  // is not, so the eye lands on the debt that is not going anywhere.
  let clearByTone = 'accent';
  if (clears === false) {
    clearByTone = 'clay';
  }

  // On a debt that never clears, dragging far enough makes it clear, so the hint says that.
  let sliderNote = 'Drag it to see what a little more each month is worth.';

  if (clears === false) {
    sliderNote = 'Drag it far enough and this debt starts clearing. That is the point where it turns around.';
  } else if (extra > 0) {
    sliderNote = 'That is not enough extra to change the payoff month.';
  }

  // A debt that already clears shows months and interest saved. One that never
  // cleared has nothing to compare, so it shows that it now clears, and when.
  let answerPanel = null;

  if (effect.possible === true && effect.turnsAround === true) {
    answerPanel = (
      <div className="mt-5 border-t border-line pt-5">
        <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">
          This debt now clears
        </p>
        <p className="tnum mt-1.5 font-display text-[26px] leading-none text-accent">
          {formatMonthYear(effect.newPayoffDate)}
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink2">
          On the EMI alone it never finished. {formatRupees(debt.emi + extra)} a month
          clears it in {formatDuration(effect.newMonths)}.
        </p>
      </div>
    );
  } else if (effect.possible === true) {
    answerPanel = (
      <div className="mt-5 grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
        <StatTile
          label="Free sooner by"
          value={formatDuration(effect.monthsSaved)}
          note={formatMonthYear(effect.newPayoffDate) + ' instead'}
          tone="accent"
        />
        <StatTile
          label="Interest saved"
          value={formatRupees(effect.interestSaved)}
          note="money that stays yours"
          tone="accent"
        />
      </div>
    );
  }

  return (
    <Card as="article">

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

        <RecordActions onEdit={onEdit} onDelete={onDelete} />
      </div>

      {/* ---------- The four numbers ---------- */}
      <div className="mt-6 grid gap-5 border-y border-lineSoft py-5 sm:grid-cols-4">
        <StatTile label="Still owed" value={formatRupees(debt.principal)} size="md" />
        <StatTile label="Rate" value={debt.annualRate + '%'} size="md" />
        <StatTile label="EMI" value={formatRupees(debt.emi)} size="md" />
        <StatTile label="Clear by" value={clearByText} size="md" tone={clearByTone} />
      </div>

      {/* ---------- What it costs as things stand ---------- */}
      <p className="mt-5 text-[14px] leading-relaxed text-ink2">{costLine}</p>

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
        {extra > 0 && effect.possible === true ? answerPanel : (
          <p className="mt-4 text-2xs text-muted">{sliderNote}</p>
        )}
      </div>
    </Card>
  );
}
