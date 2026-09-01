/*
  How close one plan gets the emergency fund to where it should be.

  A single ratio against a limit is a meter, not a chart. There is one number
  and one target, and a bar chart of one bar, or a pie of two slices, is a
  picture of nothing. The meter says it in a shape somebody reads in a second.

  The fill uses the same evergreen ramp as everything else that measures "how
  much" rather than "which one", so a fuller bar is a darker bar and the colour
  carries the same meaning it does elsewhere on the page.

  The target line is the point of the whole thing. A bar with no marker on it
  invites "is that good?", which is the question the component exists to answer.

  Props:
    monthsCovered - months of costs this plan would cover after a year
    monthsTarget  - what this household should be aiming for
*/

// Copied from tailwind.config.js, because an inline style cannot take a class.
const COLOURS = {
  low: '#80B9A1',     // chartRamp1
  middle: '#439C7B',  // chartRamp2
  full: '#007654',    // chartRamp3
  track: '#F0EBE2',   // paperDeep
  marker: '#12100D',  // ink
};

export default function SafetyMeter({ monthsCovered, monthsTarget }) {
  /*
    The bar runs to a bit past the target rather than to the target itself.

    A bar that ends exactly at the goal has nowhere to show somebody who has
    passed it, and "full" and "twice what you needed" would look identical.
  */
  const scaleTo = monthsTarget * 1.5;

  let fillShare = (monthsCovered / scaleTo) * 100;

  if (fillShare > 100) {
    fillShare = 100;
  }
  if (fillShare < 0) {
    fillShare = 0;
  }

  const targetShare = (monthsTarget / scaleTo) * 100;

  /*
    Darker as it fills, which is what a one-hue ramp is for. This is magnitude,
    not identity, so the colour is allowed to encode the value: unlike a
    categorical chart, there is nothing else for it to mean.
  */
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
