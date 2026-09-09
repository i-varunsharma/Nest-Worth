import { formatDuration } from '../../lib/debt';

/*
  How much sooner each plan clears the debt.

  One row per plan, and on each row two dots joined by a bar: where the current
  plan finishes, and where this one does. That shape is a dumbbell, and it is
  the right form for before-and-after per item, because the thing worth seeing
  is the distance between the two rather than either number on its own.

  Two shades of one hue, not two hues. These are the same measurement at two
  moments, not two different things, and giving them separate colours would
  suggest they were unrelated.

  A plan that changes nothing gets a single dot, because a dumbbell with both
  ends in the same place is a bar of zero length pretending to be information.

  Props:
    scenarios - the list from the API
    activeKey - which plan is being read, drawn darker than the rest
*/

/*
  SVG and inline styles cannot take a Tailwind class, so colours have to be
  written out here. They point at the same CSS variables the Tailwind classes
  use, which is what keeps a chart in step with the rest of the page and lets it
  follow the dark theme without this file knowing there is one.
*/
const COLOURS = {
  before: 'var(--chart-muted)',        // where you finish as things stand
  after: 'var(--chart-invest)',        // where this plan finishes
  afterQuiet: 'var(--chart-invest-quiet)', // the same, for a plan not being read
  bar: 'rgb(var(--color-line))',
};

export default function DebtDumbbell({ scenarios, activeKey }) {
  /*
    The plan as it stands is the thing everything else is measured against.

    Without a baseline the rows are four unrelated numbers. With one, every row
    answers the same question: what does choosing this cost or save you?
  */
  let baselineMonths = null;

  scenarios.forEach((scenario) => {
    if (scenario.key === 'balanced') {
      baselineMonths = scenario.outcomes.debtFreeMonths;
    }
  });

  // Nothing to compare: either no debts at all, or none of them ever clear.
  if (baselineMonths === null || baselineMonths === 0) {
    return null;
  }

  // The scale runs to the slowest plan, so every row is drawn against the same
  // ruler and the bars are honestly comparable.
  let longest = baselineMonths;

  scenarios.forEach((scenario) => {
    const months = scenario.outcomes.debtFreeMonths;

    if (months !== null && months > longest) {
      longest = months;
    }
  });

  function shareFor(months) {
    return (months / longest) * 100;
  }

  return (
    <div className="space-y-7">
      {scenarios.map((scenario) => {
        const months = scenario.outcomes.debtFreeMonths;

        // A plan whose debts never clear inside the simulation has no dot to
        // draw, so it says so in words instead of drawing something misleading.
        if (months === null) {
          return (
            <div key={scenario.key}>
              <p className="text-2xs text-muted">{scenario.name}</p>
              <p className="mt-1 text-[13px] text-clay">Debt does not clear within 15 years.</p>
            </div>
          );
        }

        const isActive = scenario.key === activeKey;
        const monthsSaved = baselineMonths - months;

        let dotColour = COLOURS.afterQuiet;
        if (isActive === true) {
          dotColour = COLOURS.after;
        }

        // Left dot is whichever finishes first, so the bar always has a
        // positive width and never has to be drawn backwards.
        const from = Math.min(months, baselineMonths);
        const to = Math.max(months, baselineMonths);

        let labelClasses = 'text-2xs text-muted';
        if (isActive === true) {
          labelClasses = 'text-2xs font-semibold text-ink';
        }

        return (
          <div key={scenario.key}>
            <div className="flex items-baseline justify-between gap-4">
              <p className={labelClasses}>{scenario.name}</p>
              <p className="tnum text-2xs text-muted">{formatDuration(months)}</p>
            </div>

            {/* ---------- The row ---------- */}
            <div className="relative mt-2 h-4">
              {/* The track the dots sit on. */}
              <div
                className="absolute top-1/2 h-px w-full -translate-y-1/2"
                style={{ backgroundColor: COLOURS.bar }}
              />

              {/* The bar between the two ends, which is the thing being read. */}
              {monthsSaved !== 0 ? (
                <div
                  className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full transition-[left,width] duration-700 ease-smooth"
                  style={{
                    left: shareFor(from) + '%',
                    width: shareFor(to - from) + '%',
                    backgroundColor: dotColour,
                  }}
                />
              ) : null}

              {/* Where you finish as things stand. Only drawn when this plan
                  differs, or the two dots would sit on top of each other. */}
              {monthsSaved !== 0 ? (
                <span
                  aria-hidden="true"
                  className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface"
                  style={{ left: shareFor(baselineMonths) + '%', backgroundColor: COLOURS.before }}
                />
              ) : null}

              {/* Where this plan finishes. */}
              <span
                aria-hidden="true"
                className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface transition-[left] duration-700 ease-smooth"
                style={{ left: shareFor(months) + '%', backgroundColor: dotColour }}
              />
            </div>

            {/*
              The caption belongs to the bar above it, and has to look like it
              does. On screen the gap below a row now has to be clearly larger
              than the gap above this line, or it reads as a heading for the
              NEXT plan instead. That is the whole reason the rows are spaced
              7 apart and this sits at 1.
            */}
            {monthsSaved > 0 ? (
              <p className="mt-1 text-2xs font-medium text-accent">
                {formatDuration(monthsSaved)} sooner than your plan as it stands
              </p>
            ) : null}
          </div>
        );
      })}

      {/* ---------- The legend ---------- */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-lineSoft pt-4">
        <span className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: COLOURS.before }}
          />
          <span className="text-2xs text-muted">As things stand</span>
        </span>

        <span className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: COLOURS.after }}
          />
          <span className="text-2xs text-muted">With this plan</span>
        </span>
      </div>
    </div>
  );
}
