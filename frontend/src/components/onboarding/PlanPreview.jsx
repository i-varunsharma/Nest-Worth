import Card from '../shared/Card';
import Overline from '../shared/Overline';
import { buildPlan, formatRupees } from '../../lib/plan';

/* The plan built from the answers so far, updated as each question is answered. */
export default function PlanPreview({ household }) {
  const plan = buildPlan(household);

  return (
    <Card size="panel" className="sticky top-16">
      <Overline>Your plan so far</Overline>

      <p className="tnum mt-5 font-display text-[34px] leading-none text-accent">{formatRupees(plan.free)}</p>
      <p className="mt-2 text-[13px] text-muted">yours to direct each month</p>

      <div className="mt-7 space-y-4 border-t border-lineSoft pt-6">
        {plan.buckets.map((bucket) => {
          return (
            <div key={bucket.key} className="flex items-baseline justify-between">
              <span className="text-[14px] text-ink2">{bucket.label}</span>
              <span className="tnum text-[14.5px] font-semibold text-ink">{formatRupees(bucket.amount)}</span>
            </div>
          );
        })}
      </div>

      <p className="mt-7 border-t border-lineSoft pt-5 text-2xs leading-relaxed text-muted">
        This updates as you answer. Nothing is saved until you finish.
      </p>
    </Card>
  );
}
