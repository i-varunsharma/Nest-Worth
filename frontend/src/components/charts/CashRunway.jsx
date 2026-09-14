import { formatRupees } from '../../lib/plan';

/*
  Cash in hand at the end of each month, through one shock.

  Bars rather than a line, because the question is "which month goes below
  zero", and a bar crossing the zero line answers that at a glance. Months
  below zero are clay, the theme's warning colour. Months inside the crisis
  get a faint band behind them, so the cause and the effect sit side by side.

  The bars are drawn in SVG and stretched to the card. The labels are plain
  HTML underneath, so they stay a readable size on a phone instead of shrinking
  with the drawing.

  Props:
    rows - [{ month, cash, isCrisis }] from runShock, month 0 is today
*/

// The drawing's own units. preserveAspectRatio="none" stretches it to fit.
const WIDTH = 650;
const HEIGHT = 220;

// Room above the tallest bar and below the lowest, so neither touches the edge.
const PAD = 10;

// Each bar takes this share of its slot; the rest is the gap between bars.
const BAR_SHARE = 0.62;

// SVG cannot take Tailwind classes, so these point at the same CSS variables.
const COLOURS = {
  cash: 'var(--chart-save)',
  shortfall: 'rgb(var(--color-clay))',
  crisis: 'rgb(var(--color-clay-soft))',
  axis: 'rgb(var(--color-line-strong))',
};

export default function CashRunway({ rows }) {
  let highest = 0;
  let lowest = 0;

  rows.forEach((row) => {
    if (row.cash > highest) {
      highest = row.cash;
    }
    if (row.cash < lowest) {
      lowest = row.cash;
    }
  });

  // Guard against a range of zero, which would divide by zero below.
  let range = highest - lowest;
  if (range <= 0) {
    range = 1;
  }

  const plotHeight = HEIGHT - PAD * 2;
  const slot = WIDTH / rows.length;
  const barWidth = slot * BAR_SHARE;

  // SVG counts downwards from the top, so a bigger value needs a smaller y.
  function yFor(value) {
    return PAD + ((highest - value) / range) * plotHeight;
  }

  const zeroY = yFor(0);

  return (
    <div>
      {/* The padding makes room for the two labels above and below the bars,
          so they never sit on top of one. */}
      <div className="relative py-5">
        {/* The highest and lowest values, as HTML so they keep their size. */}
        <p className="tnum pointer-events-none absolute left-0 top-0 text-2xs text-muted">
          {formatRupees(highest, { short: true })}
        </p>

        {lowest < 0 ? (
          <p className="tnum pointer-events-none absolute bottom-0 left-0 text-2xs text-clay">
            {formatRupees(lowest, { short: true })}
          </p>
        ) : null}

        <svg
          viewBox={'0 0 ' + WIDTH + ' ' + HEIGHT}
          preserveAspectRatio="none"
          className="h-56 w-full"
          role="img"
          aria-label="Cash in hand at the end of each month for a year"
        >
          {/* The crisis months, as a band behind the bars. */}
          {rows.map((row, index) => {
            if (row.isCrisis === false) {
              return null;
            }

            return (
              <rect
                key={'crisis-' + row.month}
                x={index * slot}
                y={0}
                width={slot}
                height={HEIGHT}
                fill={COLOURS.crisis}
              />
            );
          })}

          {rows.map((row, index) => {
            const top = yFor(Math.max(row.cash, 0));
            const bottom = yFor(Math.min(row.cash, 0));

            let fill = COLOURS.cash;
            if (row.cash < 0) {
              fill = COLOURS.shortfall;
            }

            // A zero bar still gets one unit of height, so the month is visible.
            let height = bottom - top;
            if (height < 1) {
              height = 1;
            }

            return (
              <rect
                key={'bar-' + row.month}
                x={index * slot + (slot - barWidth) / 2}
                y={top}
                width={barWidth}
                height={height}
                rx="2"
                fill={fill}
              />
            );
          })}

          {/* The zero line. non-scaling-stroke keeps it one pixel thick when the
              drawing is stretched. */}
          <line
            x1="0"
            y1={zeroY}
            x2={WIDTH}
            y2={zeroY}
            stroke={COLOURS.axis}
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      {/* Month labels, one per bar. */}
      <div className="mt-2 grid text-center" style={{ gridTemplateColumns: 'repeat(' + rows.length + ', minmax(0, 1fr))' }}>
        {rows.map((row) => {
          let label = String(row.month);
          if (row.month === 0) {
            label = 'Now';
          }

          return (
            <span key={'label-' + row.month} className="text-2xs text-muted">
              {label}
            </span>
          );
        })}
      </div>

      {/* The legend. Colour is never the only way to tell the parts apart. */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COLOURS.cash }} />
          <span className="text-2xs text-ink2">Cash in hand</span>
        </span>

        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COLOURS.shortfall }} />
          <span className="text-2xs text-ink2">Below zero</span>
        </span>

        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm border border-line" style={{ backgroundColor: COLOURS.crisis }} />
          <span className="text-2xs text-ink2">Months the shock lasts</span>
        </span>
      </div>
    </div>
  );
}
