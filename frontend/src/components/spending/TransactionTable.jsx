import Card from '../shared/Card';
import Overline from '../shared/Overline';
import { ALL_CATEGORIES } from '../../lib/categories';
import { formatRupees } from '../../lib/plan';

/*
  Every line of a month with the category it was filed under, which can be
  changed. A category set here is never overwritten by a later import.

  Props:
    transactions  the month's lines
    savingId      the id of the line being saved, whose dropdown is disabled
    onCategoryChange(transaction, category)
*/

/* '2026-08-14' as '14 Aug'. The year is already in the page heading. */
function shortDate(day) {
  const monthName = new Date(day + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short' });
  return day.slice(8) + ' ' + monthName;
}

const HEADING_CLASSES = 'pb-2.5 pr-4 text-2xs font-semibold uppercase tracking-widest2 text-muted';

export default function TransactionTable({ transactions, savingId, onCategoryChange }) {
  return (
    <Card size="section" className="mt-6">
      <Overline>Every line, and what it was filed as</Overline>

      <p className="mt-3 text-[13.5px] leading-relaxed text-ink2">
        Change any of these and the bars above follow. A category you set yourself is never overwritten by a
        later guess.
      </p>

      {/* Scrolls inside its own box on a narrow screen instead of widening the page. */}
      <div className="-mx-2 mt-5 overflow-x-auto px-2">
        <table className="w-full min-w-[560px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line">
              <th className={HEADING_CLASSES}>Date</th>
              <th className={HEADING_CLASSES}>What the bank called it</th>
              <th className={HEADING_CLASSES + ' text-right'}>Amount</th>
              <th className={HEADING_CLASSES}>Filed as</th>
            </tr>
          </thead>

          <tbody>
            {transactions.map((row) => {
              // Money arriving is in the accent colour, so a salary stands out.
              let amountColour = 'text-ink';
              let sign = '';

              if (row.direction === 'credit') {
                amountColour = 'text-accent';
                sign = '+';
              }

              return (
                <tr key={row.id} className="border-b border-lineSoft last:border-0">
                  <td className="tnum py-3 pr-4 align-middle text-[13px] text-muted">{shortDate(row.occurredOn)}</td>

                  {/* Long narrations are cut with an ellipsis; title shows the whole line on hover. */}
                  <td title={row.description} className="max-w-[240px] truncate py-3 pr-4 align-middle text-[13.5px] text-ink2">
                    {row.description}
                  </td>

                  <td className={'tnum py-3 pr-4 text-right align-middle text-[13.5px] font-semibold ' + amountColour}>
                    {sign}{formatRupees(row.amount)}
                  </td>

                  <td className="py-3 align-middle">
                    <select
                      aria-label={'Category for ' + row.description}
                      value={row.category}
                      disabled={savingId === row.id}
                      onChange={(event) => onCategoryChange(row, event.target.value)}
                      className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-[13px] text-ink transition-colors hover:border-ink focus:border-accent disabled:opacity-50"
                    >
                      {ALL_CATEGORIES.map((category) => {
                        return (
                          <option key={category.key} value={category.key}>
                            {category.label}
                          </option>
                        );
                      })}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
