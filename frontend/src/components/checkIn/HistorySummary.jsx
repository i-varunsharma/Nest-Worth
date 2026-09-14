import Overline from '../shared/Overline';
import { monthLabel } from '../../lib/checkins';
import { formatRupees } from '../../lib/plan';

/*
  What the recorded months add up to, from GET /api/insights, where the running
  total and averages are worked out in SQL. Hidden below two months, where a
  "best month" is just the only month.
*/

const MINIMUM_MONTHS = 2;

export default function HistorySummary({ insights }) {
  if (insights.summary.monthsRecorded < MINIMUM_MONTHS) {
    return null;
  }

  const summary = insights.summary;

  // The last month carries the running total of everything kept.
  const latest = insights.months[insights.months.length - 1];

  const boxes = [
    {
      label: 'Kept in total',
      value: formatRupees(latest.keptRunningTotal, { short: true }),
      note: 'across ' + summary.monthsRecorded + ' months',
    },
    { label: 'Average kept', value: summary.averageKeptPercent + '%', note: 'of what you earned' },
  ];

  if (insights.bestMonth) {
    boxes.push({
      label: 'Best month',
      value: monthLabel(insights.bestMonth.month),
      note: insights.bestMonth.keptPercent + '% kept',
    });
  }

  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-3">
      {boxes.map((box) => {
        return (
          <div key={box.label} className="rounded-[18px] border border-line bg-surface p-4">
            <Overline>{box.label}</Overline>
            <p className="tnum mt-2 font-display text-[22px] leading-none text-accent">{box.value}</p>
            <p className="mt-1.5 text-2xs text-muted">{box.note}</p>
          </div>
        );
      })}
    </div>
  );
}
