import { formatRupees } from '../../lib/plan';

/*
  The main card on the dashboard: how much of this month's income is genuinely
  yours to direct, and how the plan splits it three ways.

  It does no maths of its own. The dashboard works out the plan once and passes
  the finished thing in, which keeps this file purely about showing it.

  Props:
    plan - the object that buildPlan() returned
*/

// Colours and one line of explanation for each bucket. The keys match the
// "key" on each bucket that buildPlan produces.
const bucketLooks = {
  spend: {
    barColour: 'bg-ink/25',
    note: 'Eating out, shopping, trips: the part you choose',
  },
  save: {
    barColour: 'bg-brass',
    note: 'Emergency buffer and near-term goals',
  },
  invest: {
    barColour: 'bg-accent',
    note: 'Index funds, left alone for a decade',
  },
};

export default function PlanCard({ plan }) {
  // How much of the salary was already claimed, as a percentage.
  const claimedPercent = ((plan.support + plan.emi) / plan.income) * 100;

  return (
    <div id="plan" className="rounded-[26px] border border-line bg-surface p-6 shadow-card sm:p-8">

      <div className="flex items-center justify-between border-b border-lineSoft pb-5">
        <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">
          Yours to direct this month
        </p>
        <p className="text-2xs text-muted">Recalculated just now</p>
      </div>

      {/* The headline number. */}
      <p className="tnum mt-6 font-display text-[clamp(2.6rem,6vw,3.6rem)] leading-none text-accent">
        {formatRupees(plan.free)}
      </p>

      <p className="mt-3 text-[14px] leading-relaxed text-ink2">
        Out of {formatRupees(plan.income)} take-home.{' '}
        {plan.support + plan.emi > 0
          ? formatRupees(plan.support + plan.emi) + ' leaves before you decide anything.'
          : 'Nothing is claimed on it yet.'}
      </p>

      {/* A green bar with a grey section on the left for the claimed part. */}
      <div className="mt-5 flex h-2 overflow-hidden rounded-full bg-accent/25">
        <div
          className="h-full bg-ink/20 transition-[width] duration-700 ease-smooth"
          style={{ width: claimedPercent + '%' }}
        />
      </div>

      {/* One row per bucket. */}
      <div className="mt-8 space-y-5">
        {plan.buckets.map((bucket) => {
          const look = bucketLooks[bucket.key];

          return (
            <div key={bucket.key}>
              <div className="flex items-baseline justify-between gap-4">
                <p className="text-[15px] font-semibold text-ink">{bucket.label}</p>
                <div className="text-right">
                  <span className="tnum text-[16px] font-semibold text-ink">
                    {formatRupees(bucket.amount)}
                  </span>
                  <span className="tnum ml-2 text-[13px] text-muted">{bucket.percent}%</span>
                </div>
              </div>

              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-line/70">
                <div
                  className={'h-full rounded-full transition-[width] duration-700 ease-smooth ' + look.barColour}
                  style={{ width: bucket.percent + '%' }}
                />
              </div>

              <p className="mt-2 text-2xs text-muted">{look.note}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
