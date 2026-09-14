import { Link } from 'react-router-dom';
import ProjectionChart from '../landing/ProjectionChart';
import Eyebrow from '../shared/Eyebrow';
import { buildProjectionRows, formatRupees } from '../../lib/plan';

/*
  What this month's investing grows into. With nothing invested there is nothing
  to draw, so the section says why instead of showing an empty chart.
*/

export const PROJECTION_YEARS = 15;

export default function FutureProjection({ monthlyInvestment, isFollowingPlan }) {
  if (monthlyInvestment <= 0) {
    let note = 'There is nothing left to invest once your household and your debts are paid. That changes as '
      + 'soon as either of those does.';

    if (isFollowingPlan === true) {
      note = 'This plan sends that money somewhere else first, which is the point of it. The investing starts '
        + 'once that job is done, and everything freed up by then goes into it.';
    }

    return (
      <div id="future" className="mt-16">
        <Eyebrow>Future you</Eyebrow>

        <div className="mt-5 rounded-[26px] border border-line bg-surface p-6 shadow-card sm:p-8">
          <h2 className="max-w-lg font-display text-[clamp(1.5rem,2.6vw,2rem)] leading-[1.15] tracking-[-0.02em]">
            Nothing is being invested this month, and that is the plan.
          </h2>
          <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-ink2">{note}</p>
          <Link to="/plans" className="sweep mt-5 inline-block text-[14px] font-semibold text-ink">
            See what each plan is worth
          </Link>
        </div>
      </div>
    );
  }

  const rows = buildProjectionRows(monthlyInvestment, PROJECTION_YEARS);
  const finalValue = rows[rows.length - 1].value;

  return (
    <div id="future" className="mt-16">
      <Eyebrow>Future you</Eyebrow>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-5">
        <h2 className="max-w-md font-display text-[clamp(1.7rem,3vw,2.3rem)] leading-[1.1] tracking-[-0.02em]">
          {formatRupees(monthlyInvestment)} a month, for {PROJECTION_YEARS} years.
        </h2>
        <p className="tnum font-display text-[clamp(2rem,4vw,2.8rem)] leading-none text-accent">
          {formatRupees(finalValue, { short: true })}
        </p>
      </div>

      <div className="mt-7">
        <ProjectionChart rows={rows} years={PROJECTION_YEARS} />
      </div>
    </div>
  );
}
