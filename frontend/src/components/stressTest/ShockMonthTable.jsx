import { formatRupees } from '../../lib/plan';

/* Every month of the walk as a table, so nothing is only available as a chart. */
export default function ShockMonthTable({ rows }) {
  return (
    <details className="mt-6 rounded-[22px] border border-line bg-surface p-6">
      <summary className="cursor-pointer text-[14px] font-semibold text-ink">Every month as a table</summary>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-[13.5px]">
          <thead>
            <tr className="border-b border-line text-2xs uppercase tracking-widest2 text-muted">
              <th className="py-2 pr-4 font-semibold">Month</th>
              <th className="py-2 pr-4 font-semibold">Cash at the end</th>
              <th className="py-2 font-semibold">During the shock</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              let monthLabel = 'Month ' + row.month;
              if (row.month === 0) {
                monthLabel = 'Today';
              }

              let crisisText = '';
              if (row.isCrisis === true) {
                crisisText = 'Yes';
              }

              let cashClasses = 'tnum py-2 pr-4 text-ink';
              if (row.cash < 0) {
                cashClasses = 'tnum py-2 pr-4 font-semibold text-clay';
              }

              return (
                <tr key={row.month} className="border-b border-lineSoft last:border-0">
                  <td className="py-2 pr-4 text-ink2">{monthLabel}</td>
                  <td className={cashClasses}>{formatRupees(row.cash)}</td>
                  <td className="py-2 text-ink2">{crisisText}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </details>
  );
}
