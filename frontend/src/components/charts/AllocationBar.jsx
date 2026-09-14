import { formatRupees } from '../../lib/plan';

/*
  Where one month's income goes, as a stacked horizontal bar:

    committed  rent, family support and EMIs, gone before any choice (grey)
    spend, save, invest  the choices, each with its own colour

  Segments are separated by 2px gaps rather than borders. A value is written inside
  a segment only when it fits; every figure is also in the legend.

  Props:
    allocation  { committed, spend, save, invest, extraToDebt }
    income      the month's income
*/

// Below this share of the bar, a label will not fit inside the segment and goes
// unlabelled instead of being cut in half.
const MIN_SHARE_FOR_INSIDE_LABEL = 14;

export default function AllocationBar({ allocation, income }) {
  // Extra paid at a debt is drawn as committed, because it leaves before any choice.
  // The legend still names it separately.
  const committedTotal = allocation.committed + allocation.extraToDebt;

  const pieces = [
    // Each piece carries the colour its own percentage is printed in. The
    // committed grey needs a different one from the three strong colours,
    // because no single text colour is readable on both.
    { key: 'committed', label: 'Already committed', amount: committedTotal, fill: 'var(--chart-committed)', labelClass: 'text-chartLabelCommitted' },
    { key: 'spend', label: 'Spend', amount: allocation.spend, fill: 'var(--chart-spend)', labelClass: 'text-chartLabel' },
    { key: 'save', label: 'Save', amount: allocation.save, fill: 'var(--chart-save)', labelClass: 'text-chartLabel' },
    { key: 'invest', label: 'Invest', amount: allocation.invest, fill: 'var(--chart-invest)', labelClass: 'text-chartLabel' },
  ];

  // Never divide by zero, however odd the data.
  let total = income;
  if (total <= 0) {
    total = 1;
  }

  const segments = [];

  pieces.forEach((piece) => {
    if (piece.amount <= 0) {
      return;
    }

    const share = (piece.amount / total) * 100;

    segments.push({
      key: piece.key,
      label: piece.label,
      amount: piece.amount,
      fill: piece.fill,
      labelClass: piece.labelClass,
      share: share,
      // A label inside a narrow segment gets cut in half, so it is left out.
      showLabelInside: share >= MIN_SHARE_FOR_INSIDE_LABEL,
    });
  });

  return (
    <div>
      {/* ---------- The bar ---------- */}
      {/* gap-[2px] is the surface showing between segments. It is what
          separates them; nothing is outlined. */}
      <div className="flex h-9 w-full gap-[2px] overflow-hidden rounded-lg">
        {segments.map((segment) => {
          return (
            <div
              key={segment.key}
              // title is the browser's own tooltip. Every figure is also in the
              // legend below, so nothing depends on hovering.
              title={segment.label + ': ' + formatRupees(segment.amount)}
              className="flex items-center justify-center transition-[width] duration-700 ease-smooth"
              style={{ width: segment.share + '%', backgroundColor: segment.fill }}
            >
              {segment.showLabelInside === true ? (
                <span className={'tnum px-2 text-2xs font-semibold ' + segment.labelClass}>
                  {Math.round(segment.share)}%
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* ---------- The legend ---------- */}
      {/* The legend is always shown, so reading the bar never depends on telling colours apart. */}
      <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
        {segments.map((segment) => {
          return (
            <div key={segment.key} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: segment.fill }}
              />
              <dt className="text-2xs text-muted">{segment.label}</dt>
              <dd className="tnum text-2xs font-semibold text-ink2">
                {formatRupees(segment.amount)}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
