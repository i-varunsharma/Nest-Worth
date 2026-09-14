import Card from '../shared/Card';
import RecordActions from '../shared/RecordActions';
import StatTile from '../shared/StatTile';
import { describeGoal } from '../../lib/goals';
import { formatRupees } from '../../lib/plan';

/* One goal: progress, what is left, and what it needs each month. */
export default function GoalCard({ goal, onEdit, onDelete }) {
  const detail = describeGoal(goal);

  let barColour = 'bg-accent';
  let status = detail.months + ' months left';

  if (detail.isComplete === true) {
    barColour = 'bg-brass';
    status = 'done';
  } else if (detail.isOverdue === true) {
    barColour = 'bg-clay';
    status = 'date has passed';
  }

  return (
    <Card as="article">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-[24px] leading-tight tracking-[-0.01em]">{goal.name}</h3>
          <p className="mt-1.5 text-[13px] text-muted">
            {formatRupees(goal.savedAmount)} of {formatRupees(goal.targetAmount)} · {status}
          </p>
        </div>

        <RecordActions onEdit={onEdit} onDelete={onDelete} />
      </div>

      <div className="mt-6 h-2 overflow-hidden rounded-full bg-paperDeep">
        <div
          className={'h-full rounded-full transition-[width] duration-700 ease-smooth ' + barColour}
          style={{ width: detail.percentDone + '%' }}
        />
      </div>

      <div className="mt-5 flex flex-wrap items-baseline justify-between gap-4 border-t border-lineSoft pt-5">
        <StatTile label="Still to find" value={formatRupees(detail.remaining)} size="md" />
        <StatTile
          label="Every month"
          value={formatRupees(detail.monthlyNeeded)}
          size="md"
          tone="accent"
          className="text-right"
        />
      </div>
    </Card>
  );
}
