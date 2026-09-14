import { Link } from 'react-router-dom';
import { formatRupees } from '../../lib/plan';
import { monthLabel } from '../../lib/checkins';

/*
  How the plan is going, from the monthly check-ins. Encouraging without being
  untrue: close to target counts as on track.

  Props:
    summary           from summariseCheckins, or null when nothing is recorded
    plannedKeptShare  the plan's kept share of income, as a percentage
*/

// Only claim a direction once there are enough months for it to mean something.
const MONTHS_NEEDED_FOR_TREND = 4;

export default function ConsistencyCard({ summary, plannedKeptShare }) {
  /*
    Nothing recorded yet. Rather than an empty card of zeros, this asks for the
    first one and says what it will be worth, since the payoff for a monthly
    habit is invisible on day one.
  */
  if (summary === null) {
    return (
      <div className="rounded-[26px] border border-dashed border-line bg-surface/50 p-6 sm:p-7">
        <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">
          How it is going
        </p>

        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink2">
          Nothing recorded yet. The plan above is a guess until you tell it what
          actually happened, and one month takes about a minute.
        </p>

        <Link
          to="/check-in"
          className="sweep mt-5 inline-block text-[14px] font-semibold text-ink"
        >
          Record your first month
        </Link>
      </div>
    );
  }

  /*
    The headline sentence and the colour, worked out here so the markup stays
    readable. There are three cases and they are genuinely different messages,
    not one message with a number swapped in.
  */
  let toneClasses = 'text-accent';
  let verdict = '';

  if (summary.isMeetingPlan === true) {
    verdict = 'You are keeping what the plan asks for.';
  } else {
    toneClasses = 'text-brass';

    const gap = plannedKeptShare - summary.averageKeptShare;
    verdict = 'You are about ' + Math.round(gap) + ' points under the plan on average. '
      + 'That usually means the plan is too tight rather than that you are careless.';
  }

  // The trend only appears once there is enough history to mean anything.
  let trendLine = null;

  if (summary.count >= MONTHS_NEEDED_FOR_TREND) {
    if (summary.trend === 'improving') {
      trendLine = 'Your recent months are better than your earlier ones.';
    } else if (summary.trend === 'slipping') {
      trendLine = 'Your recent months are worse than your earlier ones. Worth a look at what changed.';
    } else {
      trendLine = 'Steady across the months you have recorded.';
    }
  }

  let monthWord = 'months';
  if (summary.count === 1) {
    monthWord = 'month';
  }

  return (
    <div className="rounded-[26px] border border-line bg-surface p-6 shadow-card sm:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">
          How it is going
        </p>
        <p className="text-2xs text-muted">
          {summary.count} {monthWord} recorded
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className={'tnum font-display text-[30px] leading-none ' + toneClasses}>
          {Math.round(summary.averageKeptShare)}%
        </p>
        <p className="text-[14px] text-ink2">
          kept on average, against a plan of {Math.round(plannedKeptShare)}%
        </p>
      </div>

      <p className="mt-3 text-[14px] leading-relaxed text-ink2">{verdict}</p>

      {trendLine ? (
        <p className="mt-2 text-[14px] leading-relaxed text-ink2">{trendLine}</p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-baseline justify-between gap-3 border-t border-lineSoft pt-5">
        <p className="text-[13px] text-muted">
          Best month was {monthLabel(summary.bestMonth)}, at {Math.round(summary.bestShare)}%.
        </p>

        <Link to="/check-in" className="sweep text-[13px] font-semibold text-ink">
          {formatRupees(summary.totalKept)} kept in total
        </Link>
      </div>
    </div>
  );
}
