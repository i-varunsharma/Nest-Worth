import Card from '../shared/Card';
import StatTile from '../shared/StatTile';
import { formatRupees } from '../../lib/plan';

/* The total sent each month, its share of income, and how many people. */
export default function FamilySummary({ finances, peopleCount }) {
  let shareOfIncome = 0;
  if (finances.plan.income > 0) {
    shareOfIncome = Math.round((finances.plan.support / finances.plan.income) * 100);
  }

  return (
    <Card className="mb-6 grid gap-5 sm:grid-cols-3">
      <StatTile label="Every month" value={formatRupees(finances.plan.support)} />
      <StatTile label="Share of income" value={shareOfIncome + '%'} />
      <StatTile label="People" value={String(peopleCount)} />
    </Card>
  );
}
