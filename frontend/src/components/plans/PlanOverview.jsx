import { useState } from 'react';
import AllocationBar from '../charts/AllocationBar';
import Card from '../shared/Card';
import Eyebrow from '../shared/Eyebrow';
import Overline from '../shared/Overline';
import * as api from '../../lib/api';
import { formatRupees } from '../../lib/plan';

/*
  The selected plan: what it does, where it lands in fifteen years compared with
  the plan as it stands, where every rupee goes, and the button to follow it.

  Props:
    active        the scenario being read
    baseline      the "plan as it stands" scenario, to compare against
    income        monthly take-home
    followingKey  the plan currently followed, or null
    onFollowChanged(newKey)  called with what the server saved
*/

function differenceLine(active, baseline) {
  const difference = active.outcomes.totalAfterYears - baseline.outcomes.totalAfterYears;

  if (difference > 0) {
    return formatRupees(difference, { short: true }) + ' more than your plan as it stands.';
  }

  if (difference < 0) {
    return formatRupees(Math.abs(difference), { short: true })
      + ' less than your plan as it stands, and it clears the debt sooner.';
  }

  return 'The same as your plan as it stands.';
}

export default function PlanOverview({ active, baseline, income, followingKey, onFollowChanged }) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const isFollowingThisOne = followingKey === active.key;

  // Pressing it on the plan already followed goes back to the recommended split.
  const handleFollow = async () => {
    setIsSaving(true);
    setSaveError('');

    let wanted = active.key;
    if (isFollowingThisOne === true) {
      wanted = null;
    }

    const result = await api.choosePlan(wanted);

    setIsSaving(false);

    if (result.ok === false) {
      setSaveError(result.error);
      return;
    }

    // Uses what the server saved, so a failed save never looks like it worked.
    onFollowChanged(result.data.household.chosenPlan);
  };

  let note = 'Following this changes your dashboard to show this split instead of the recommended one. '
    + 'Nothing else changes, and you can switch back any time.';
  let buttonLabel = 'Follow this plan';
  let buttonClasses = 'bg-ink text-paper hover:bg-accent';

  if (isFollowingThisOne === true) {
    note = 'This is the plan your dashboard is showing.';
    buttonLabel = 'Stop following';
    buttonClasses = 'border border-line bg-surface text-ink2 hover:border-ink hover:text-ink';
  } else if (followingKey) {
    note = 'You are following a different plan at the moment. Following this one replaces it.';
  }

  if (isSaving === true) {
    buttonLabel = 'Saving…';
  }

  return (
    <Card size="panel" className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-lg">
          <Eyebrow>{active.name}</Eyebrow>
          <p className="mt-4 text-[15.5px] leading-relaxed text-ink2">{active.idea}</p>
        </div>

        <div className="text-right">
          <Overline>In 15 years</Overline>
          <p className="tnum mt-2 font-display text-[clamp(2rem,4vw,2.8rem)] leading-none text-accent">
            {formatRupees(active.outcomes.totalAfterYears, { short: true })}
          </p>
          <p className="mt-1.5 text-2xs text-muted">invested plus cash</p>
          <p className="mt-2 text-2xs text-muted">{differenceLine(active, baseline)}</p>
        </div>
      </div>

      <div className="mt-9 border-t border-lineSoft pt-7">
        <Overline>Where every rupee of {formatRupees(income)} goes</Overline>
        <div className="mt-5">
          <AllocationBar allocation={active.allocation} income={income} />
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-lineSoft pt-7">
        <p className="max-w-md text-[14px] leading-relaxed text-ink2">{note}</p>

        <button
          type="button"
          onClick={handleFollow}
          disabled={isSaving}
          className={'shrink-0 rounded-full px-6 py-3 text-[14px] font-semibold transition-all duration-300 ease-smooth disabled:cursor-not-allowed disabled:opacity-50 ' + buttonClasses}
        >
          {buttonLabel}
        </button>
      </div>

      {saveError ? <p role="alert" className="mt-4 text-[13.5px] text-clay">{saveError}</p> : null}
    </Card>
  );
}
