import Card from '../shared/Card';
import Notice from '../shared/Notice';
import StatTile from '../shared/StatTile';
import { formatRupees } from '../../lib/format';
import { DEFAULT_SUPPORT_PER_PERSON } from '../../lib/plan';

/*
  The total sent each month, its share of income, and how many people.

  The count is the one the plan uses: everyone listed, plus anyone counted in
  onboarding who is not listed yet. Those still cost the estimate, and the
  note below says so, so the page and the plan never disagree on who is counted.
*/
export default function FamilySummary({ finances }) {
  let shareOfIncome = 0;
  if (finances.plan.income > 0) {
    shareOfIncome = Math.round((finances.plan.support / finances.plan.income) * 100);
  }

  const notListed = finances.peopleNotListed;

  let notListedText = '';
  if (notListed === 1) {
    notListedText = 'You told us about 1 more person than is listed here. Their support is still estimated at '
      + formatRupees(DEFAULT_SUPPORT_PER_PERSON) + ' a month. Add them, or if the amounts above already cover '
      + 'everyone, change the number of people in Settings.';
  } else if (notListed > 1) {
    notListedText = 'You told us about ' + notListed + ' more people than are listed here. Each is still estimated at '
      + formatRupees(DEFAULT_SUPPORT_PER_PERSON) + ' a month. Add them, or if the amounts above already cover '
      + 'everyone, change the number of people in Settings.';
  }

  return (
    <div className="mb-6">
      <Card className="grid gap-5 sm:grid-cols-3">
        <StatTile label="Every month" value={formatRupees(finances.plan.support)} />
        <StatTile label="Share of income" value={shareOfIncome + '%'} />
        <StatTile label="People" value={String(finances.dependents)} />
      </Card>

      <Notice tone="info" className="mt-4">{notListedText}</Notice>
    </div>
  );
}
