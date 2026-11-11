import MoneyFigure from '../shared/MoneyFigure';

/* The four totals for a month of transactions, each counting up to its figure. */

export default function MonthFigures({ summary }) {
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MoneyFigure label="Came in" amount={summary.income} note="salary and anything else" />
      <MoneyFigure label="Spent" amount={summary.spent} note={summary.lines + ' lines read'} />
      <MoneyFigure label="Put away" amount={summary.putAway} note="investing, not spending" />
      <MoneyFigure label="Kept" amount={summary.kept} note="what was left of the money that came in" isNegative={summary.kept < 0} />
    </div>
  );
}
