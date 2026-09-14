import Card from '../shared/Card';
import StatTile from '../shared/StatTile';
import { formatDuration, formatMonthYear, summariseDebts } from '../../lib/debt';
import { formatRupees } from '../../lib/plan';

/*
  The four totals above the list of debts.

  When any debt never clears at its EMI there is no honest debt free date, and
  the interest total only covers the debts that do clear, so both say so.
*/
export default function DebtSummary({ debts }) {
  const summary = summariseDebts(debts);

  let debtFreeValue = formatMonthYear(summary.debtFreeDate);
  let debtFreeNote = formatDuration(summary.longestMonths) + ' away';
  let debtFreeTone = 'accent';
  let interestLabel = 'Interest still to pay';

  if (summary.everythingClears === false) {
    debtFreeValue = 'Not yet';
    debtFreeNote = 'one debt never clears at its current EMI';
    debtFreeTone = 'clay';
    interestLabel = 'Interest on the debts that clear';
  }

  return (
    <Card className="mb-8 grid gap-5 sm:grid-cols-4">
      <StatTile label="Total owed" value={formatRupees(summary.totalOwed)} />
      <StatTile label="Every month" value={formatRupees(summary.totalEmi)} />
      <StatTile label="Debt free" value={debtFreeValue} note={debtFreeNote} tone={debtFreeTone} />
      <StatTile label={interestLabel} value={formatRupees(summary.totalInterest)} tone="clay" />
    </Card>
  );
}
