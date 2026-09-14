import { monthLabel } from '../../lib/checkins';
import { formatRupees } from '../../lib/plan';

/* One card per recorded month: how the income was split, and any note. */
export default function CheckinHistory({ checkins }) {
  if (checkins.length === 0) {
    return (
      <p className="mt-4 text-[14.5px] leading-relaxed text-ink2">
        Nothing recorded yet. Do this once at the end of the month and by March you will have something worth
        looking at.
      </p>
    );
  }

  return (
    <div className="mt-5 space-y-4">
      {checkins.map((entry) => {
        // A month with no income still draws, without dividing by zero.
        const income = Math.max(entry.income, 1);
        const keptShare = ((entry.saved + entry.invested) / income) * 100;

        return (
          <article key={entry.id} className="rounded-[18px] border border-line bg-surface p-5 shadow-card">
            <div className="flex items-baseline justify-between">
              <p className="text-[15px] font-semibold text-ink">{monthLabel(entry.month)}</p>
              <p className="tnum text-[13px] text-muted">kept {Math.round(keptShare)}%</p>
            </div>

            <div className="mt-4 flex h-1.5 overflow-hidden rounded-full bg-paperDeep">
              <div className="h-full bg-ink/25" style={{ width: (entry.spent / income) * 100 + '%' }} />
              <div className="h-full bg-brass" style={{ width: (entry.saved / income) * 100 + '%' }} />
              <div className="h-full bg-accent" style={{ width: (entry.invested / income) * 100 + '%' }} />
            </div>

            <div className="mt-3.5 flex flex-wrap gap-x-5 gap-y-1.5 text-2xs text-muted">
              <span className="tnum">Spent {formatRupees(entry.spent)}</span>
              <span className="tnum">Saved {formatRupees(entry.saved)}</span>
              <span className="tnum">Invested {formatRupees(entry.invested)}</span>
            </div>

            {entry.note ? (
              <p className="mt-3 border-t border-lineSoft pt-3 text-[13px] italic text-ink2">{entry.note}</p>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
