import { formatDuration } from '../../lib/debt';

/*
  How much sooner each plan clears the debt: one row per plan with two dots, the
  current plan's finish and this plan's, joined by a bar. Two shades of one hue,
  because both dots are the same measurement. A plan that changes nothing gets one dot.

  Props:
    scenarios  from the API
    activeKey  the plan being read, drawn darker
*/

// SVG attributes cannot use Tailwind classes, so colours point at the same CSS
// variables the theme uses, which also makes the dark theme work here.
const COLOURS = {
  before: 'var(--chart-muted)',        // where you finish as things stand
  after: 'var(--chart-invest)',        // where this plan finishes
  afterQuiet: 'var(--chart-invest-quiet)', // the same, for a plan not being read
  bar: 'rgb(var(--color-line))',
};

export default function DebtDumbbell({ scenarios, activeKey }) {
  // Every row is measured against the plan as it stands.
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

            {/* The caption sits close under its own bar, with a larger gap before the next row,
                so it does not read as the next plan's heading. */}
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
