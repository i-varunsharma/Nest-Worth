/*
  Months of emergency cover against the target, as a meter with a target line.
  One ratio against a limit needs a meter, not a chart. The fill uses the one-hue
  ramp, darker as it fills.

  Props:
    monthsCovered  months of costs covered after a year on this plan
    monthsTarget   the target for this household
*/

// SVG attributes cannot use Tailwind classes, so colours point at the same CSS
// variables the theme uses, which also makes the dark theme work here.
const COLOURS = {
  low: 'var(--chart-ramp-1)',
  middle: 'var(--chart-ramp-2)',
  full: 'var(--chart-ramp-3)',
  track: 'rgb(var(--color-paper-deep))',
  marker: 'rgb(var(--color-ink))',
};

export default function SafetyMeter({ monthsCovered, monthsTarget }) {
  // The bar runs past the target, so passing it looks different from just reaching it.
  const scaleTo = monthsTarget * 1.5;

  let fillShare = (monthsCovered / scaleTo) * 100;

  if (fillShare > 100) {
    fillShare = 100;
  }
  if (fillShare < 0) {
    fillShare = 0;
  }

  const targetShare = (monthsTarget / scaleTo) * 100;

  // Darker as it fills: the colour shows how much, not which one.
  let fillColour = COLOURS.low;

  if (monthsCovered >= monthsTarget) {
    fillColour = COLOURS.full;
  } else if (monthsCovered >= monthsTarget / 2) {
    fillColour = COLOURS.middle;
  }

  // The sentence under the bar. Worked out here so the markup stays readable.
  let verdict = '';

  if (monthsCovered >= monthsTarget) {
    verdict = 'Past the ' + monthsTarget + ' months this household should aim for.';
  } else {
    const short = Math.round((monthsTarget - monthsCovered) * 10) / 10;
    verdict = short + ' months short of the ' + monthsTarget + ' you should aim for.';
  }

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="tnum font-display text-[26px] leading-none text-ink">
          {monthsCovered} months
        </p>
        <p className="text-2xs text-muted">of costs covered, after a year</p>
      </div>

      {/* ---------- The meter ---------- */}
      <div className="relative mt-4 h-2.5 w-full overflow-hidden rounded-full"
        style={{ backgroundColor: COLOURS.track }}>
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-smooth"
          style={{ width: fillShare + '%', backgroundColor: fillColour }}
        />
      </div>

      {/* ---------- The target ---------- */}
      {/* Outside the bar rather than inside it, so it stays visible whether the
          fill has reached it or not. */}
      <div className="relative mt-1.5 h-4">
        <div
          className="absolute -translate-x-1/2"
          style={{ left: targetShare + '%' }}
        >
          <span
            aria-hidden="true"
            className="mx-auto block h-2 w-px"
            style={{ backgroundColor: COLOURS.marker }}
          />
          <span className="mt-0.5 block whitespace-nowrap text-2xs text-muted">
            {monthsTarget} mo target
          </span>
        </div>
      </div>

      <p className="mt-5 text-[13px] leading-relaxed text-ink2">{verdict}</p>
    </div>
  );
}
