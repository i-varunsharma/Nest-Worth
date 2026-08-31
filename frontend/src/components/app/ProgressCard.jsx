import { formatRupees } from '../../lib/plan';

/*
  A small card showing how the month is going: a bar for the savings goal and a
  row of marks for the streak.

  Be honest about what this is. There is no transaction data yet, so the progress
  shown here is a fixed example rather than anything measured. Once a backend
  exists this is where real numbers arrive. The percentage is written as a
  constant below rather than hidden in the markup, precisely so it is obvious
  that it is a placeholder.

  Props:
    monthlySaving - the rupees the plan sets aside each month
*/

// Stand-in figures, to be replaced by real data later.
const EXAMPLE_PERCENT_DONE = 68;
const EXAMPLE_WEEKS_KEPT = 5;
const WEEKS_IN_A_MONTH = 7;

export default function ProgressCard({ monthlySaving }) {
  const savedSoFar = (monthlySaving * EXAMPLE_PERCENT_DONE) / 100;

  return (
    <div className="rounded-[26px] border border-line bg-surface p-6 shadow-card sm:p-7">

      <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">
        This month so far
      </p>

      <div className="mt-5 flex items-baseline justify-between">
        <span className="tnum font-display text-[30px] leading-none">
          {formatRupees(savedSoFar)}
        </span>
        <span className="tnum text-[13px] text-muted">
          of {formatRupees(monthlySaving)}
        </span>
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-paperDeep">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-[1200ms] ease-smooth"
          style={{ width: EXAMPLE_PERCENT_DONE + '%' }}
        />
      </div>

      {/* The streak: one mark per week, filled for the weeks that were kept. */}
      <div className="mt-7 border-t border-lineSoft pt-5">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-medium text-ink2">Weeks on plan</p>
          <p className="tnum text-[13px] text-muted">
            {EXAMPLE_WEEKS_KEPT} of {WEEKS_IN_A_MONTH}
          </p>
        </div>

        <div className="mt-3 flex gap-1.5">
          {/* Array.from builds a list of the right length so we can draw one
              mark per week. The underscore means "I do not need this value". */}
          {Array.from({ length: WEEKS_IN_A_MONTH }).map((_, weekNumber) => {
            const wasKept = weekNumber < EXAMPLE_WEEKS_KEPT;

            let markClasses = 'h-6 flex-1 rounded-full transition-colors duration-500 ';
            if (wasKept === true) {
              markClasses = markClasses + 'bg-brass';
            } else {
              markClasses = markClasses + 'bg-paperDeep';
            }

            return <span key={weekNumber} className={markClasses} />;
          })}
        </div>
      </div>

      <p className="mt-5 text-2xs leading-relaxed text-muted">
        Example figures. Real progress appears once your accounts start reporting in.
      </p>
    </div>
  );
}
