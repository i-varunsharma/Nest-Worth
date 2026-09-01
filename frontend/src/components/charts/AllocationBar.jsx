import { formatRupees } from '../../lib/plan';

/*
  Where every rupee of one month's income goes, as one horizontal bar.

  The job here is part-to-whole, which is what a stacked bar is for. It is
  horizontal rather than vertical because the category names are words rather
  than dates, and words fit beside a horizontal bar without being turned on
  their side.

  Four pieces, in the order the money actually leaves:

    committed   rent, the people you support, the EMIs. Gone before any choice.
    spend       what you choose to spend
    save        what you hold as cash
    invest      what you put to work

  Committed is grey on purpose. The other three are decisions and get a colour;
  this one is not a decision, and giving it a hue would make it compete with the
  parts somebody can actually do something about.

  Two details that are not decoration:

  The 2px gaps between the segments are the page colour showing through, not
  borders. A border adds ink that is not data, and at this thickness two hues
  meeting directly read as one muddy band.

  The value is only written inside a segment when it genuinely fits. Text that
  is clipped in the middle of a number is worse than no text, and every figure
  is in the legend underneath anyway.

  Props:
    allocation - { committed, spend, save, invest, extraToDebt }
    income     - the month's income, so the widths are shares of something real
*/

// Below this share of the bar, a label will not fit inside the segment and goes
// unlabelled instead of being cut in half.
const MIN_SHARE_FOR_INSIDE_LABEL = 14;

export default function AllocationBar({ allocation, income }) {
  /*
    Extra sent at a debt is drawn as part of "committed", because that is what
    it becomes the moment somebody chooses this plan: money that leaves before
    anything else. It is named separately in the legend, so choosing to pay more
    is still visible as a choice.
  */
  const committedTotal = allocation.committed + allocation.extraToDebt;

  const pieces = [
    { key: 'committed', label: 'Already committed', amount: committedTotal, fill: '#CFC6B8' },
    { key: 'spend', label: 'Spend', amount: allocation.spend, fill: '#3275B4' },
    { key: 'save', label: 'Save', amount: allocation.save, fill: '#B07A00' },
    { key: 'invest', label: 'Invest', amount: allocation.invest, fill: '#007654' },
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
                <span className="tnum px-2 text-2xs font-semibold text-white/90">
                  {Math.round(segment.share)}%
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* ---------- The legend ---------- */}
      {/*
        Always present, because colour on its own is not an identity channel:
        somebody who cannot tell the slate from the brass has nothing else to go
        on. The swatch carries the colour and the text stays in the theme's ink,
        so the words are readable whatever the colour beside them is doing.
      */}
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
