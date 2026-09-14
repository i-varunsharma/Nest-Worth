import DebtDumbbell from '../charts/DebtDumbbell';
import SafetyMeter from '../charts/SafetyMeter';
import Card from '../shared/Card';
import Overline from '../shared/Overline';
import { formatDuration, formatMonthYear } from '../../lib/debt';
import { formatRupees } from '../../lib/plan';

/* When the debt clears, and how long savings would last, on the selected plan. */

function debtLineFor(active) {
  if (active.outcomes.debtFreeMonths === null) {
    return 'On this plan the debt does not clear within fifteen years.';
  }

  return 'Debt free by ' + formatMonthYear(new Date(active.outcomes.debtFreeDate))
    + ', which is ' + formatDuration(active.outcomes.debtFreeMonths) + ' away.';
}

export default function PlanConsequences({ scenarios, active, today }) {
  const hasDebts = today.debtCount > 0;

  // Two columns only when there are two cards; one card alone looks unfinished in half the width.
  let gridClasses = 'mt-6 grid gap-6';
  if (hasDebts === true) {
    gridClasses = gridClasses + ' lg:grid-cols-2';
  }

  return (
    <div className={gridClasses}>
      {hasDebts === true ? (
        <Card>
          <Overline>When the debt goes</Overline>
          <p className="mt-3 text-[14px] leading-relaxed text-ink2">{debtLineFor(active)}</p>
          <div className="mt-6">
            <DebtDumbbell scenarios={scenarios} activeKey={active.key} />
          </div>
        </Card>
      ) : null}

      <Card>
        <Overline>If your income stopped</Overline>
        <div className="mt-5">
          <SafetyMeter monthsCovered={active.outcomes.monthsCoveredInAYear} monthsTarget={today.monthsTarget} />
        </div>
        <p className="mt-6 border-t border-lineSoft pt-5 text-2xs leading-relaxed text-muted">
          Counted from {formatRupees(today.liquidSavings)} you can reach today, plus a year of this plan&rsquo;s
          saving. Only cash and fixed deposits count.
        </p>
      </Card>
    </div>
  );
}
