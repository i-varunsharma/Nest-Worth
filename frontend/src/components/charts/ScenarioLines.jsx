import { useEffect, useRef, useState } from 'react';
import { formatRupees } from '../../lib/plan';

/*
  Every plan's total (invested plus cash) over fifteen years, on one scale.

  Totals rather than investments alone, or the plan that holds cash would look
  like it lost money. The plan being read is green and the others are one grey,
  so the eye has one line to follow.

  Props:
    scenarios  from the API, each with rows of { year, total }
    activeKey  the plan being read
    onHover    optional, called with a scenario key or null
*/

// The SVG's own units; the browser scales it to the card's width. A phone gets a
// taller box, otherwise the chart would render about 140px tall with unreadable labels.
const WIDTH = 640;
const HEIGHT_WIDE = 260;
const HEIGHT_NARROW = 430;

// Below this many pixels of card, use the taller box. It matches Tailwind's
// "sm" breakpoint, which is where the rest of the page changes its mind too.
const NARROW_BELOW = 640;

// Room above the highest point and below for the year labels, sized from the label
// size so larger labels on phones are not cut off.
function padTopFor(labelSize) {
  return labelSize + 10;
}

function padBottomFor(labelSize) {
  return labelSize + 16;
}

// SVG attributes cannot use Tailwind classes, so colours point at the same CSS
// variables the theme uses, which also makes the dark theme work here.
const COLOURS = {
  active: 'var(--chart-invest)',
  other: 'var(--chart-muted)',
  grid: 'rgb(var(--color-line-soft))',
  axis: 'rgb(var(--color-line-strong))',
  surface: 'rgb(var(--color-surface))',
};

// How many horizontal gridlines. Four is enough to read a value against and
// few enough to stay in the background.
const GRID_LINES = 4;

export default function ScenarioLines({ scenarios, activeKey, onHover }) {
  // Which year the pointer is over, or null when it is not over the chart.
  const [hoverYear, setHoverYear] = useState(null);

  const plotRef = useRef(null);

  // Whether the narrow canvas is needed, asked with matchMedia, which reports
  // changes without listening to every resize. jsdom has no matchMedia.
  function askIfNarrow() {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return null;
    }

    return window.matchMedia('(max-width: ' + (NARROW_BELOW - 1) + 'px)');
  }

  // Read during the first render, so the chart does not draw at the wrong height and
  // then jump.
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

  // One scale for every line, taken from the tallest value across all plans, or the
  // comparison would mean nothing.
  let tallest = 1;

  scenarios.forEach((scenario) => {
    scenario.rows.forEach((row) => {
      if (row.total > tallest) {
        tallest = row.total;
      }
    });
  });

  // SVG text scales with the box, so labels are larger on the taller narrow canvas
  // to stay readable.
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

  // The pointer's pixel position as a year, using its share of the displayed width.
  function handlePointerMove(event) {
    if (!plotRef.current) {
      return;
    }

    const box = plotRef.current.getBoundingClientRect();

    // A zero width (not laid out yet) would give NaN, and the crosshair would vanish
    // silently.
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
          {/* Four evenly spaced year labels, without repeats: over two years the quarters
              round to 0, 1, 1, 2, and a repeated key makes React drop one. */}
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
        {/* An HTML tooltip, which wraps text on its own. It ignores the pointer so it cannot
            flicker. */}
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
      {/* A legend, so telling the lines apart never depends on seeing colour. */}
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
