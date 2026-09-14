import Card from '../shared/Card';
import CountUp from '../shared/CountUp';
import Overline from '../shared/Overline';
import { formatRupees } from '../../lib/plan';

/* The four totals for a month of transactions, each counting up to its figure. */

function formatShort(value) {
  return formatRupees(value, { short: true });
}

function Figure({ label, amount, note, isNegative }) {
  let valueColour = 'text-accent';
  if (isNegative === true) {
    valueColour = 'text-clay';
  }

  return (
    <Card size="tile">
      <Overline>{label}</Overline>
      <p className={'tnum mt-2.5 font-display text-[26px] leading-none ' + valueColour}>
        <CountUp to={amount} format={formatShort} />
      </p>
      <p className="mt-2 text-2xs text-muted">{note}</p>
    </Card>
  );
}

export default function MonthFigures({ summary }) {
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Figure label="Came in" amount={summary.income} note="salary and anything else" />
      <Figure label="Spent" amount={summary.spent} note={summary.lines + ' lines read'} />
      <Figure label="Put away" amount={summary.putAway} note="investing, not spending" />
      <Figure label="Kept" amount={summary.kept} note="what was left of the money that came in" isNegative={summary.kept < 0} />
    </div>
  );
}
