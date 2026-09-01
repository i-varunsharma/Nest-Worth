import { useEffect, useRef, useState } from 'react';
import { formatRupees } from '../../lib/plan';

/*
  Every plan's money, drawn on one set of axes over fifteen years.

  It is the TOTAL that is drawn: what is invested plus what is held as cash.
  Charting only the investments made the plan that saves rather than invests
  look as though it destroyed the money, when what it really does is trade
  growth for money you can reach on a bad Tuesday.

  This is the chart the whole page is built around, because it is the only place
  the choices can be compared honestly. Two splits of the same money look nearly
  identical as percentages and land tens of lakhs apart.

  One decision shapes everything else here: the plan being looked at is drawn in
  the theme's green, and every other plan is drawn in one grey. That is called
  emphasis, and it is deliberate. Four coloured lines is a chart where the eye
  has nowhere to land and the reader has to keep checking a legend to remember
  which is which. One line and its context is a chart that answers a question.

  Nothing here is dual-axis. Rupees are the only thing measured, so there is one
  scale. Two scales on one plot invent a relationship the data does not contain,
  and the reader has no way to know where the second scale was pinned.

  Props:
    scenarios  - the list from the API, each with rows of { year, total }
    activeKey  - which one is being looked at
    onHover    - optional, called with a scenario key or null
*/

/*
  The made-up canvas everything is measured against. The browser stretches it to
  whatever width the card happens to be, keeping the shape.

  There are two heights because keeping the shape is the problem on a phone. A
  640 by 260 box squeezed into a 340px card renders 138px tall, and at that size
  the axis labels are unreadable and the four lines sit on top of each other.
  Making the box TALLER in its own units means the browser scales it to
  something legible instead.
*/
const WIDTH = 640;
const HEIGHT_WIDE = 260;
const HEIGHT_NARROW = 430;

// Below this many pixels of card, use the taller box. It matches Tailwind's
// "sm" breakpoint, which is where the rest of the page changes its mind too.
const NARROW_BELOW = 640;

/*
  Room at the top for the highest point not to touch the edge, and at the
  bottom for the year labels.

  Both are worked out from the label size rather than fixed, because they only
  exist to make room for those labels. Left at a constant while the labels grew
  for the narrow canvas, the top one was cut in half by the edge of the chart
  and the bottom one sat on top of "today".
*/
function padTopFor(labelSize) {
  return labelSize + 10;
}

function padBottomFor(labelSize) {
  return labelSize + 16;
}

// Copied from tailwind.config.js. An SVG stroke cannot take a Tailwind class,
// so these are the one place colours are written by hand. If a chart colour
// changes there, change it here.
const COLOURS = {
  active: '#007654',   // chartInvest, the theme's evergreen
  other: '#C8BFB2',    // chartMuted
  grid: '#EEE8DE',     // lineSoft
  axis: '#D6CCBE',     // lineStrong
  surface: '#FFFFFF',
};

// How many horizontal gridlines. Four is enough to read a value against and
// few enough to stay in the background.
const GRID_LINES = 4;

export default function ScenarioLines({ scenarios, activeKey, onHover }) {
  // Which year the pointer is over, or null when it is not over the chart.
  const [hoverYear, setHoverYear] = useState(null);

  const plotRef = useRef(null);

  /*
    Is the card narrow enough to need the taller canvas?

    matchMedia is the browser's own way of asking a CSS question from
    JavaScript, and it tells us when the answer changes rather than making us
    listen to every resize event and work it out each time.

    Not every environment has it. jsdom does not, and a crash here would take
    the whole page down rather than just the chart.
  */
  function askIfNarrow() {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return null;
    }

    return window.matchMedia('(max-width: ' + (NARROW_BELOW - 1) + 'px)');
  }

  /*
    The answer is read here, during the first render, rather than set from
    inside the effect afterwards.

    Passing a function to useState runs it once, for the initial value only.
    Setting this from an effect instead would render the chart at the wrong
    height first and then immediately render it again at the right one, which
    is a visible jump and what the linter warns about.
  */
  const [isNarrow, setIsNarrow] = useState(() => {
    const query = askIfNarrow();

    if (!query) {
      return false;
    }

    return query.matches;
  });

  // From here on, only React to the window actually changing size.
  useEffect(() => {
    const query = askIfNarrow();

    if (!query) {
      return undefined;
    }

    const onChange = (event) => {
      setIsNarrow(event.matches);
    };

    query.addEventListener('change', onChange);

    // Removing the listener matters: without it, every visit to this page
    // leaves another one behind, all firing on every resize forever.
    return () => {
      query.removeEventListener('change', onChange);
    };
  }, []);

  let HEIGHT = HEIGHT_WIDE;
  if (isNarrow === true) {
    HEIGHT = HEIGHT_NARROW;
  }

  if (scenarios.length === 0) {
    return null;
  }

  const years = scenarios[0].rows[scenarios[0].rows.length - 1].year;

  /*
    The tallest value across every scenario, not just the active one.

    All the lines have to be drawn against the same scale or the comparison is
    meaningless. Scaling each to its own maximum would make every plan look
    identically successful, which is the opposite of what this chart is for.
  */
  let tallest = 1;

  scenarios.forEach((scenario) => {
    scenario.rows.forEach((row) => {
      if (row.total > tallest) {
        tallest = row.total;
      }
    });
  });

  /*
    Text inside an SVG scales with the box, so a label that is 11 units tall in
    a 640-wide box is 11 units tall in the narrow one too, and gets squeezed to
    about six real pixels. Growing it with the box keeps it the same size on
    screen whatever the card is doing.
  */
  let labelSize = 11;
  if (isNarrow === true) {
    labelSize = 19;
  }

  const PAD_TOP = padTopFor(labelSize);
  const PAD_BOTTOM = padBottomFor(labelSize);

  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;

  // The years to write along the bottom, each one only once.
  const yearLabels = [];

  [0, Math.round(years / 3), Math.round((years * 2) / 3), years].forEach((year) => {
    if (yearLabels.includes(year) === false) {
      yearLabels.push(year);
    }
  });

  function xFor(year) {
    return (year / years) * WIDTH;
  }

  function yFor(value) {
    // SVG counts downwards from the top, so a big value needs a small y.
    return PAD_TOP + plotHeight - (value / tallest) * plotHeight;
  }

  function pathFor(rows) {
    const pieces = [];

    rows.forEach((row, index) => {
      const command = index === 0 ? 'M' : 'L';
      pieces.push(command + xFor(row.year) + ' ' + yFor(row.total));
    });

    return pieces.join(' ');
  }

  /*
    Turns a pointer position into a year.

    The chart is drawn on a 640-wide canvas but displayed at whatever width the
    card is, so the pointer's real pixel position has to be turned back into a
    share of the width before it means anything.
  */
  function handlePointerMove(event) {
    if (!plotRef.current) {
      return;
    }

    const box = plotRef.current.getBoundingClientRect();

    /*
      A width of zero means the chart is not laid out yet, or is hidden. It
      happens in a test environment and it can happen for a frame in a browser.
      Dividing by it gives Infinity, which rounds to NaN, and NaN passes both
      the checks below untouched: the crosshair is then drawn at NaN and simply
      vanishes, with nothing in the console to say why.
    */
    if (box.width <= 0) {
      return;
    }

    const share = (event.clientX - box.left) / box.width;

    let year = Math.round(share * years);

    if (year < 0) {
      year = 0;
    }
    if (year > years) {
      year = years;
    }

    setHoverYear(year);
  }

  function handlePointerLeave() {
    setHoverYear(null);

    if (onHover) {
      onHover(null);
    }
  }

  // The active scenario is drawn last so it sits on top of the grey ones.
  const ordered = [];

  scenarios.forEach((scenario) => {
    if (scenario.key !== activeKey) {
      ordered.push(scenario);
    }
  });

  scenarios.forEach((scenario) => {
    if (scenario.key === activeKey) {
      ordered.push(scenario);
    }
  });

  // The rows under the pointer, for the tooltip. Sorted biggest first, because
  // that is the order they appear on the chart.
  const hovered = [];

  if (hoverYear !== null) {
    scenarios.forEach((scenario) => {
      const row = scenario.rows[hoverYear];

      if (row) {
        hovered.push({ key: scenario.key, name: scenario.name, value: row.total });
      }
    });

    hovered.sort((a, b) => { return b.value - a.value; });
  }

  return (
    <div>
      <div
        ref={plotRef}
        className="relative"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <svg
          viewBox={'0 0 ' + WIDTH + ' ' + HEIGHT}
          className="w-full"
          role="img"
          aria-label={'What each plan is worth in total over ' + years + ' years'}
        >
          {/* ---------- Gridlines ---------- */}
          {/* Hairline and solid, one step off the surface. They are there to be
              measured against, not looked at. */}
          {Array.from({ length: GRID_LINES + 1 }).map((ignored, index) => {
            const value = (tallest / GRID_LINES) * index;
            const y = yFor(value);

            return (
              <g key={index}>
                <line
                  x1="0"
                  y1={y}
                  x2={WIDTH}
                  y2={y}
                  stroke={index === 0 ? COLOURS.axis : COLOURS.grid}
                  strokeWidth="1"
                />
                <text
                  x="4"
                  y={y - labelSize * 0.45}
                  className="fill-muted"
                  style={{ fontSize: labelSize + 'px' }}
                >
                  {formatRupees(value, { short: true })}
                </text>
              </g>
            );
          })}

          {/* ---------- The crosshair ---------- */}
          {hoverYear !== null ? (
            <line
              x1={xFor(hoverYear)}
              y1={PAD_TOP}
              x2={xFor(hoverYear)}
              y2={PAD_TOP + plotHeight}
              stroke={COLOURS.axis}
              strokeWidth="1"
            />
          ) : null}

          {/* ---------- The lines ---------- */}
          {ordered.map((scenario) => {
            const isActive = scenario.key === activeKey;

            let stroke = COLOURS.other;
            if (isActive === true) {
              stroke = COLOURS.active;
            }

            const lastRow = scenario.rows[scenario.rows.length - 1];

            return (
              <g key={scenario.key}>
                <path
                  d={pathFor(scenario.rows)}
                  fill="none"
                  stroke={stroke}
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />

                {/* The end marker. The white ring keeps it legible where two
                    lines finish close together. */}
                <circle
                  cx={xFor(lastRow.year)}
                  cy={yFor(lastRow.total)}
                  r="4.5"
                  fill={stroke}
                  stroke={COLOURS.surface}
                  strokeWidth="2"
                />

                {/* The dot on the crosshair, on the active line only. Putting
                    one on every line at once turns the crosshair into clutter. */}
                {hoverYear !== null && isActive === true && scenario.rows[hoverYear] ? (
                  <circle
                    cx={xFor(hoverYear)}
                    cy={yFor(scenario.rows[hoverYear].total)}
                    r="4.5"
                    fill={stroke}
                    stroke={COLOURS.surface}
                    strokeWidth="2"
                  />
                ) : null}
              </g>
            );
          })}

          {/* ---------- The year labels ---------- */}
          {/*
            Four evenly spaced years, with any repeats removed.

            Over fifteen years the quarters are 0, 5, 10 and 15 and nothing
            collides. Over two years they round to 0, 1, 1 and 2, and drawing
            the same label twice makes React complain about duplicate keys and
            quietly drop one of them.
          */}
          {yearLabels.map((year) => {
            let anchor = 'middle';
            if (year === 0) {
              anchor = 'start';
            }
            if (year === years) {
              anchor = 'end';
            }

            return (
              <text
                key={year}
                x={xFor(year)}
                y={HEIGHT - labelSize * 0.3}
                textAnchor={anchor}
                className="fill-muted"
                style={{ fontSize: labelSize + 'px' }}
              >
                {year === 0 ? 'today' : year + 'y'}
              </text>
            );
          })}
        </svg>

        {/* ---------- The tooltip ---------- */}
        {/*
          Plain HTML rather than SVG, because text wraps and lays out properly
          in HTML and has to be positioned by hand in SVG. It ignores the
          pointer so moving onto it cannot make it flicker away.
        */}
        {hoverYear !== null ? (
          <div
            className="pointer-events-none absolute top-2 rounded-xl border border-line bg-surface px-3.5 py-2.5 shadow-lift"
            style={{
              // Flip to the other side once past the middle, so it never runs
              // off the edge of the card.
              left: hoverYear / years > 0.55 ? 'auto' : xFor(hoverYear) / WIDTH * 100 + '%',
              right: hoverYear / years > 0.55 ? (1 - xFor(hoverYear) / WIDTH) * 100 + '%' : 'auto',
              marginLeft: hoverYear / years > 0.55 ? 0 : 12,
              marginRight: hoverYear / years > 0.55 ? 12 : 0,
            }}
          >
            <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">
              {hoverYear === 0 ? 'Today' : 'After ' + hoverYear + ' years'}
            </p>

            <div className="mt-2 space-y-1">
              {hovered.map((entry) => {
                const isActive = entry.key === activeKey;

                let textClasses = 'text-2xs text-muted';
                if (isActive === true) {
                  textClasses = 'text-2xs font-semibold text-ink';
                }

                return (
                  <div key={entry.key} className="flex items-center justify-between gap-4">
                    <span className={textClasses}>{entry.name}</span>
                    <span className={'tnum ' + textClasses}>
                      {formatRupees(entry.value, { short: true })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      {/* ---------- The legend ---------- */}
      {/*
        Two series means a legend, always. It is the identity channel that does
        not depend on being able to tell two colours apart.
      */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-0.5 w-5 rounded-full"
            style={{ backgroundColor: COLOURS.active }}
          />
          <span className="text-2xs font-semibold text-ink2">The plan you are reading</span>
        </span>

        <span className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-0.5 w-5 rounded-full"
            style={{ backgroundColor: COLOURS.other }}
          />
          <span className="text-2xs text-muted">The others, for comparison</span>
        </span>
      </div>
    </div>
  );
}
