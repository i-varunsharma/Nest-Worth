import useReveal from '../../hooks/useReveal';

/*
  ProjectionChart
  ---------------
  Draws the two lines showing money invested versus what it grows into.

  This file contains ONLY the drawing. The words and the big number next to it
  live in Projection.jsx. Splitting them means neither file is doing two jobs at
  once, and you can read the maths here without wading through layout.

  The chart is hand-drawn with SVG rather than a chart library, because it only
  ever draws two lines. Pulling in a whole charting library for that would be
  heavier than the entire rest of the page.

  How the drawing works, in short:
  we pick a made-up canvas 560 wide and 240 tall, turn every year into an x and y
  point on that canvas, and join the points into a line. The browser then
  stretches that canvas to whatever width the card happens to be, so the chart
  looks right on a phone and on a monitor without any extra code.

  Props:
    rows  - one entry per year, each { year, invested, value }
    years - how many years the chart covers, used for the labels
*/

// The canvas size. These are not pixels, they are just numbers we made up.
// Everything below is measured against them.
const CANVAS_WIDTH = 560;
const CANVAS_HEIGHT = 240;

// A small gap at the top, so the highest point is not glued to the edge.
const TOP_PADDING = 12;

/*
  SVG needs real colour values, because a stroke cannot take a Tailwind class.
  These three are copied from the theme in tailwind.config.js. If you change a
  colour there, change it here too. They are the only hand-written colours in
  the whole project.
*/
const COLOURS = {
  valueLine: '#1F5340',    // the "accent" green
  investedLine: '#D6CCBE', // "lineStrong"
  gridLine: '#EEE8DE',     // "lineSoft"
};

export default function ProjectionChart({ rows, years }) {
  // chartRef goes on the card, isVisible turns true once it scrolls on screen.
  const [chartRef, isVisible] = useReveal();

  // The tallest value on the chart. Every point is drawn as a fraction of this,
  // so the line always fills the card no matter how big the numbers get.
  const lastRow = rows[rows.length - 1];
  let tallestValue = lastRow.value;
  if (tallestValue <= 0) {
    tallestValue = 1; // never divide by zero
  }

  /*
    Turns one row into an "x y" pair on our made-up canvas.

    x: year 0 sits at the far left, the final year at the far right.
    y: SVG counts downwards from the top, so a BIG value needs a SMALL y.
       That is why this subtracts from CANVAS_HEIGHT instead of adding to it.
  */
  function pointFor(row, whichNumber) {
    const x = (row.year / years) * CANVAS_WIDTH;
    const heightAvailable = CANVAS_HEIGHT - TOP_PADDING;
    const y = CANVAS_HEIGHT - (row[whichNumber] / tallestValue) * heightAvailable;
    return x + ' ' + y;
  }

  /*
    Joins all the points into the string SVG wants for a line, which looks like
    "M0 240 L37 232 L74 219", where M means move here and L means line to here.
  */
  function lineFor(whichNumber) {
    const pieces = [];

    rows.forEach((row, index) => {
      if (index === 0) {
        pieces.push('M' + pointFor(row, whichNumber));
      } else {
        pieces.push('L' + pointFor(row, whichNumber));
      }
    });

    return pieces.join(' ');
  }

  // The pale green shading under the value line. It is the same line, then down
  // to the bottom right corner, along to the bottom left, and closed with Z.
  const shadedArea =
    lineFor('value')
    + ' L' + CANVAS_WIDTH + ' ' + CANVAS_HEIGHT
    + ' L0 ' + CANVAS_HEIGHT
    + ' Z';

  // Everything on the chart stays invisible until the card scrolls into view.
  let fadedIn = 0;
  if (isVisible === true) {
    fadedIn = 1;
  }

  // The green line draws itself by hiding its own length and then revealing it.
  // pathLength="1" tells the browser to treat the line as being exactly 1 long,
  // whatever its real length, which makes this easy to reason about: 1 is fully
  // hidden and 0 is fully drawn.
  let lineHidden = 1;
  if (isVisible === true) {
    lineHidden = 0;
  }

  return (
    <div ref={chartRef} className="rounded-[26px] border border-line bg-surface p-6 shadow-card sm:p-8">

      <div className="flex items-center justify-between">
        <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">
          Projected corpus
        </p>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-2xs text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />Value
          </span>
          <span className="flex items-center gap-1.5 text-2xs text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-line" />Invested
          </span>
        </div>
      </div>

      <svg
        viewBox={'0 0 ' + CANVAS_WIDTH + ' ' + CANVAS_HEIGHT}
        className="mt-6 h-auto w-full overflow-visible"
        role="img"
        aria-label={'Projected corpus after ' + years + ' years'}
      >
        {/* A gradient fading from pale green at the top to nothing at the
            bottom, used to shade the space under the line. */}
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLOURS.valueLine} stopOpacity="0.20" />
            <stop offset="100%" stopColor={COLOURS.valueLine} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Five faint horizontal guide lines. */}
        {[0, 0.25, 0.5, 0.75, 1].map((position) => {
          const y = CANVAS_HEIGHT - position * (CANVAS_HEIGHT - TOP_PADDING);

          return (
            <line
              key={position}
              x1="0"
              x2={CANVAS_WIDTH}
              y1={y}
              y2={y}
              stroke={COLOURS.gridLine}
              strokeWidth="1"
            />
          );
        })}

        {/* The shading under the value line. */}
        <path
          d={shadedArea}
          fill="url(#areaFill)"
          style={{ opacity: fadedIn, transition: 'opacity 900ms ease-out 400ms' }}
        />

        {/* The dashed grey line: money put in, without any growth. */}
        <path
          d={lineFor('invested')}
          fill="none"
          stroke={COLOURS.investedLine}
          strokeWidth="1.5"
          strokeDasharray="4 4"
          style={{ opacity: fadedIn, transition: 'opacity 700ms ease-out 500ms' }}
        />

        {/* The green line: money put in, plus everything it earned. */}
        <path
          d={lineFor('value')}
          fill="none"
          stroke={COLOURS.valueLine}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength="1"
          style={{
            strokeDasharray: 1,
            strokeDashoffset: lineHidden,
            transition: 'stroke-dashoffset 1400ms cubic-bezier(0.22,1,0.36,1) 200ms',
          }}
        />

        {/* A dot on the very last point of the green line. */}
        <circle
          cx={CANVAS_WIDTH}
          cy={TOP_PADDING}
          r="5"
          fill={COLOURS.valueLine}
          style={{ opacity: fadedIn, transition: 'opacity 400ms ease-out 1400ms' }}
        />
      </svg>

      <div className="mt-5 flex justify-between border-t border-lineSoft pt-4 text-2xs text-muted">
        <span>Today</span>
        <span className="tnum">Year {Math.round(years / 2)}</span>
        <span className="tnum">Year {years}</span>
      </div>

      <p className="mt-4 text-2xs leading-relaxed text-muted">
        Assumes an 11% annual return, compounded monthly, with no step-up.
        Markets do not move in smooth curves, so this shows the shape of the
        decision, not a promise.
      </p>
    </div>
  );
}
