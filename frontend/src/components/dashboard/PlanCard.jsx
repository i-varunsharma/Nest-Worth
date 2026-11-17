
import { formatRupees } from '../../lib/format';
/*
  How much of the month is yours to direct, and how the plan splits it.

  Props:
    plan  from summariseFinances
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
  // Everything that leaves before the person decides anything: living costs,
  // household support and EMIs.
  const fixedCosts = plan.essentialCosts + plan.support + plan.emi;

  // How much of the salary that is, as a percentage, never wider than the bar.
  let claimedPercent = 0;
  if (plan.income > 0) {
    claimedPercent = (fixedCosts / plan.income) * 100;
  }
  if (claimedPercent > 100) {
    claimedPercent = 100;
  }

  const isShort = plan.shortfall > 0;

  // The heading, the big number and the sentence change when the month does not add up.
  let heading = 'Yours to direct this month';
  let headline = formatRupees(plan.free);
  let headlineColour = 'text-accent';
  let sentence = 'Nothing is claimed on it yet.';
  if (fixedCosts > 0) {
    sentence = formatRupees(fixedCosts) + ' goes on living costs, support and EMIs before you decide anything.';
  }

  if (isShort === true) {
    heading = 'Short every month';
    headline = '−' + formatRupees(plan.shortfall);
    headlineColour = 'text-clay';
    sentence = 'Living costs, support and EMIs come to ' + formatRupees(fixedCosts)
      + ', which is more than you take home. ' + plan.reasoning.text;
  }

  return (
    <div id="plan" className="rounded-[26px] border border-line bg-surface p-6 shadow-card sm:p-8">

      <div className="border-b border-lineSoft pb-5">
        <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">{heading}</p>
      </div>

      {/* The headline number. */}
      <p className={'tnum mt-6 font-display text-[clamp(2.6rem,6vw,3.6rem)] leading-none ' + headlineColour}>
        {headline}
      </p>

      <p className="mt-3 text-[14px] leading-relaxed text-ink2">
        Out of {formatRupees(plan.income)} take-home. {sentence}
      </p>

      {/* A green bar with a grey section on the left for the claimed part. */}
      <div className="mt-5 flex h-2 overflow-hidden rounded-full bg-accent/25">
        <div
          className="h-full bg-ink/20 transition-[width] duration-700 ease-smooth"
          style={{ width: claimedPercent + '%' }}
        />
      </div>

      {/* One row per bucket. Hidden when there is nothing to split. */}
      {isShort === false && (
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
      )}
    </div>
  );
}
