import { summariseGoals } from '../../lib/goals';
import { formatRupees } from '../../lib/plan';

/*
  Whether all the goals together fit inside the plan's monthly saving. Five goals
  can each look fine and still need more than is saved.
*/
export default function GoalsFitNotice({ goals, monthlySaving }) {
  const summary = summariseGoals(goals, monthlySaving);

  let boxClasses = 'border-accent/25 bg-accentSoft';
  let heading = 'These fit';
  let ending = ' There is room for all of them.';

  if (summary.isAffordable === false) {
    boxClasses = 'border-clay/20 bg-claySoft';
    heading = 'These do not fit yet';
    ending = ' That is ' + formatRupees(summary.shortfall)
      + ' short, so something has to move: a later date, a smaller target, or one goal at a time.';
  }

  return (
    <div className={'mb-8 rounded-[22px] border p-6 sm:p-7 ' + boxClasses}>
      <p className="text-2xs font-semibold uppercase tracking-widest2 text-ink2">{heading}</p>

      <p className="mt-3 text-[15px] leading-relaxed text-ink2">
        Together your goals need{' '}
        <span className="tnum font-semibold text-ink">{formatRupees(summary.totalMonthlyNeeded)}</span> a month.
        Your plan sets aside <span className="tnum font-semibold text-ink">{formatRupees(monthlySaving)}</span>.
        {ending}
      </p>
    </div>
  );
}
