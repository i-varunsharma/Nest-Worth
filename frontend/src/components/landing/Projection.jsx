import { useState } from 'react';
import Container from '../shared/Container';
import Eyebrow from '../shared/Eyebrow';
import Reveal from '../shared/Reveal';
import ProjectionChart from './ProjectionChart';
import { buildPlan, buildProjectionRows, formatRupees } from '../../lib/plan';

/*
  The "future you" section. It takes the Invest slice of the plan and shows what
  it grows into if it is left alone.

  This file handles the words, the big number and the 10 / 15 / 20 / 25 year
  switch. The chart itself is drawn by ProjectionChart.jsx next door.
*/

// The time spans the reader can switch between.
const YEAR_OPTIONS = [10, 15, 20, 25];

export default function Projection({ household }) {
  const [years, setYears] = useState(15);

  const plan = buildPlan(household);

  // Find the invest bucket and read its monthly amount out of it.
  let monthlyInvestment = 0;
  plan.buckets.forEach((bucket) => {
    if (bucket.key === 'invest') {
      monthlyInvestment = bucket.amount;
    }
  });

  // One row per year: { year, invested, value }
  const rows = buildProjectionRows(monthlyInvestment, years);

  const lastRow = rows[rows.length - 1];
  const finalValue = lastRow.value;
  const totalInvested = lastRow.invested;
  const totalEarned = finalValue - totalInvested;

  return (
    <section id="future" className="border-y border-line bg-paperDeep">
      <Container className="py-24 lg:py-32">
        <div className="grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-20">

          {/* ---------- Left: the numbers in words ---------- */}
          <div>
            <Reveal><Eyebrow>Future you</Eyebrow></Reveal>

            <Reveal delay={80}>
              <h2 className="mt-6 font-display text-[clamp(2.1rem,4vw,3.1rem)] leading-[1.06] tracking-[-0.02em]">
                What the boring decision is worth.
              </h2>
            </Reveal>

            <Reveal delay={150}>
              <p className="mt-6 max-w-xs text-[16px] leading-relaxed text-ink2">
                {formatRupees(monthlyInvestment)} a month, left alone.
              </p>
            </Reveal>

            <Reveal delay={210}>
              <div className="mt-10">
                <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">
                  In {years} years
                </p>
                <p className="tnum mt-2 font-display text-[clamp(2.8rem,6vw,4rem)] leading-none text-accent">
                  {formatRupees(finalValue, { short: true })}
                </p>
                <p className="mt-3 text-[13.5px] text-ink2">
                  <span className="tnum font-semibold">
                    {formatRupees(totalInvested, { short: true })}
                  </span> invested,
                  <span className="tnum font-semibold text-brass">
                    {' '}{formatRupees(totalEarned, { short: true })}
                  </span> earned.
                </p>
              </div>
            </Reveal>

            {/* The 10 / 15 / 20 / 25 year switch. */}
            <Reveal delay={270}>
              <div className="mt-8 inline-flex gap-1 rounded-full border border-line bg-surface p-1">
                {YEAR_OPTIONS.map((option) => {
                  const isChosen = years === option;

                  let optionClasses = 'rounded-full px-4 py-2 text-[13px] font-semibold transition-all duration-300 ease-smooth ';

                  if (isChosen === true) {
                    optionClasses = optionClasses + 'bg-ink text-paper';
                  } else {
                    optionClasses = optionClasses + 'text-muted hover:text-ink';
                  }

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setYears(option)}
                      aria-pressed={isChosen}
                      className={optionClasses}
                    >
                      {option}y
                    </button>
                  );
                })}
              </div>
            </Reveal>
          </div>

          {/* ---------- Right: the chart ---------- */}
          <Reveal delay={120}>
            <ProjectionChart rows={rows} years={years} />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
