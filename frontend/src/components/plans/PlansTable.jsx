import Card from '../shared/Card';
import Overline from '../shared/Overline';
import { formatDuration } from '../../lib/debt';
import { formatRupees } from '../../lib/plan';

/* Every figure on the plans page as a table, so nothing is only available as a chart. */

const HEADING_CLASSES = 'pb-3 pr-4 text-2xs font-semibold uppercase tracking-widest2 text-muted';

function debtFreeCell(scenario) {
  if (scenario.outcomes.debtFreeMonths === null) {
    return 'never';
  }
  if (scenario.outcomes.debtFreeMonths > 0) {
    return formatDuration(scenario.outcomes.debtFreeMonths);
  }
  return '—';
}

export default function PlansTable({ scenarios, activeKey, hasDebts }) {
  return (
    <Card className="mt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <Overline>All of it, as numbers</Overline>
        {/* Past the edge of a phone screen, columns are invisible unless somebody is told. */}
        <p className="text-2xs text-muted sm:hidden">Scroll sideways for the rest &#8594;</p>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line">
              <th className={HEADING_CLASSES}>Plan</th>
              <th className={HEADING_CLASSES}>Spend</th>
              <th className={HEADING_CLASSES}>Save</th>
              <th className={HEADING_CLASSES}>Invest</th>
              {hasDebts === true ? <th className={HEADING_CLASSES}>Extra at debt</th> : null}
              {hasDebts === true ? <th className={HEADING_CLASSES}>Debt free</th> : null}
              <th className={HEADING_CLASSES}>In 15 years, in total</th>
            </tr>
          </thead>

          <tbody>
            {scenarios.map((scenario) => {
              let rowClasses = 'border-b border-lineSoft text-[13.5px] text-ink2';
              if (scenario.key === activeKey) {
                rowClasses = 'border-b border-lineSoft bg-accentSoft/50 text-[13.5px] text-ink';
              }

              return (
                <tr key={scenario.key} className={rowClasses}>
                  <td className="py-3 pr-4 font-medium">{scenario.name}</td>
                  <td className="tnum py-3 pr-4">{formatRupees(scenario.allocation.spend)}</td>
                  <td className="tnum py-3 pr-4">{formatRupees(scenario.allocation.save)}</td>
                  <td className="tnum py-3 pr-4">{formatRupees(scenario.allocation.invest)}</td>
                  {hasDebts === true ? <td className="tnum py-3 pr-4">{formatRupees(scenario.allocation.extraToDebt)}</td> : null}
                  {hasDebts === true ? <td className="tnum py-3 pr-4">{debtFreeCell(scenario)}</td> : null}
                  <td className="tnum py-3 font-semibold">{formatRupees(scenario.outcomes.totalAfterYears, { short: true })}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
