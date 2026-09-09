import { useEffect, useState } from 'react';
import AppShell from '../components/app/AppShell';
import { SkeletonPage } from '../components/shared/Skeleton';
import GoalForm from '../components/app/GoalForm';
import Button from '../components/shared/Button';
import * as api from '../lib/api';
import { describeGoal, summariseGoals } from '../lib/goals';
import { buildPlan, bucketAmount, formatRupees } from '../lib/plan';
import { summariseDebts } from '../lib/debt';

/*
  The screen at /goals. Each goal, what it needs every month, and whether all of
  them together are affordable.

  That last part is the honest bit. It is easy to write down five goals and
  never notice that together they need more than you save each month. Five green
  progress bars would hide it. A sentence saying "these need ₹4,200 more than
  your plan sets aside" does not.

  Props:
    user - the signed-in person, handed down by RequireAuth
*/

export default function GoalsPage({ user }) {
  const [goals, setGoals] = useState(null);
  const [monthlySaving, setMonthlySaving] = useState(0);
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState(null);

  const reload = async () => {
    const result = await api.getGoals();

    if (result.ok) {
      setGoals(result.data.goals);
    } else {
      setLoadError(result.error);
    }
  };

  /*
    Two things are needed here: the goals themselves, and how much the plan
    actually sets aside each month to judge them against.

    Promise.all runs both requests at once rather than one after the other,
    which halves the wait. They do not depend on each other, so there is no
    reason to queue them.
  */
  useEffect(() => {
    // Set to false when this page is left. Without it, a slow answer arriving
    // after somebody has navigated away tries to update state that has gone.
    let stillMounted = true;

    const load = async () => {
      const [goalsResult, householdResult, debtsResult] = await Promise.all([
        api.getGoals(),
        api.getHousehold(),
        api.getDebts(),
      ]);

      if (!stillMounted) {
        return;
      }

      if (goalsResult.ok) {
        setGoals(goalsResult.data.goals);
      } else {
        setLoadError(goalsResult.error);
        return;
      }

      if (householdResult.ok && debtsResult.ok) {
        const debts = debtsResult.data.debts;

        const plan = buildPlan({
          income: householdResult.data.household.income,
          dependents: householdResult.data.household.dependents,
          hasLoan: debts.length > 0,
          incomeVaries: householdResult.data.household.incomeVaries,
          essentialCosts: householdResult.data.household.essentialCosts,
          emi: summariseDebts(debts).totalEmi,
        });

        setMonthlySaving(bucketAmount(plan, 'save'));
      }
    };

    load();

    return () => {
      stillMounted = false;
    };
  }, []);

  const handleAdd = async (values) => {
    const result = await api.addGoal(values);
    if (result.ok) {
      setEditing(null);
      await reload();
    }
    return result;
  };

  const handleUpdate = async (values) => {
    const result = await api.updateGoal(editing.id, values);
    if (result.ok) {
      setEditing(null);
      await reload();
    }
    return result;
  };

  const handleDelete = async (id) => {
    await api.deleteGoal(id);
    await reload();
  };

  if (loadError) {
    return (
      <AppShell user={user} title="Goals">
        <p className="text-[14.5px] text-clay">{loadError}</p>
      </AppShell>
    );
  }

  if (goals === null) {
    return (
      <AppShell user={user} title="Goals">
        <SkeletonPage label="Loading your goals" stats={3} cards={2} />
      </AppShell>
    );
  }

  const summary = summariseGoals(goals, monthlySaving);

  /*
    Which thing the form is editing, worked out before the JSX.

    The "key" matters more than it looks. React reuses a component that stays in
    the same place, and a form's useState only reads its starting values once,
    when it first appears. So pressing Edit on one row and then Edit on another
    would leave the previous row's values in the boxes while saving them against
    the new row's id, quietly overwriting the wrong record.

    Giving the form a key that changes with the target tells React it is a
    different form, so it is thrown away and rebuilt with the right values.
  */
  let formKey = 'new';
  let goalBeingEdited = null;

  if (editing !== null && editing !== 'new') {
    formKey = 'goal-' + editing.id;
    goalBeingEdited = editing;
  }

  const addButton = (
    <Button onClick={() => setEditing('new')} variant="accent">
      Add a goal
    </Button>
  );

  return (
    <AppShell
      user={user}
      title="Goals"
      subtitle="What you are saving for, and what each one costs you every month."
      action={editing === null ? addButton : null}
    >

      {editing !== null ? (
        <div className="mb-8">
          <GoalForm
            key={formKey}
            goal={goalBeingEdited}
            onSave={editing === 'new' ? handleAdd : handleUpdate}
            onCancel={() => setEditing(null)}
          />
        </div>
      ) : null}

      {goals.length === 0 && editing === null ? (
        <div className="rounded-[22px] border border-dashed border-line bg-surface/50 p-10 text-center">
          <p className="font-display text-[22px] leading-snug">No goals yet.</p>
          <p className="mx-auto mt-3 max-w-sm text-[14.5px] leading-relaxed text-ink2">
            An emergency fund is the one worth starting with. Six months of costs, sitting
            somewhere boring, is what stops a bad month becoming a bad year.
          </p>
          <div className="mt-7 flex justify-center">{addButton}</div>
        </div>
      ) : null}

      {/* ---------- Can all of these actually be afforded? ---------- */}
      {goals.length > 0 ? (
        <div
          className={
            'mb-8 rounded-[22px] border p-6 sm:p-7 '
            + (summary.isAffordable
              ? 'border-accent/25 bg-accentSoft'
              : 'border-clay/20 bg-claySoft')
          }
        >
          <p className="text-2xs font-semibold uppercase tracking-widest2 text-ink2">
            {summary.isAffordable ? 'These fit' : 'These do not fit yet'}
          </p>

          <p className="mt-3 text-[15px] leading-relaxed text-ink2">
            Together your goals need{' '}
            <span className="tnum font-semibold text-ink">
              {formatRupees(summary.totalMonthlyNeeded)}
            </span>{' '}
            a month. Your plan sets aside{' '}
            <span className="tnum font-semibold text-ink">{formatRupees(monthlySaving)}</span>.
            {summary.isAffordable
              ? ' There is room for all of them.'
              : ' That is ' + formatRupees(summary.shortfall)
                + ' short, so something has to move: a later date, a smaller target, or one goal at a time.'}
          </p>
        </div>
      ) : null}

      {/* ---------- One row per goal ---------- */}
      <div className="space-y-5">
        {goals.map((goal) => {
          const detail = describeGoal(goal);

          // The bar is green normally, brass when it is done, clay when the
          // date has already gone past.
          let barColour = 'bg-accent';
          if (detail.isComplete === true) {
            barColour = 'bg-brass';
          } else if (detail.isOverdue === true) {
            barColour = 'bg-clay';
          }

          // The same three cases in words, built here rather than as a stack of
          // ternaries inside the markup below.
          let statusText = ' · ' + detail.months + ' months left';
          if (detail.isComplete === true) {
            statusText = ' · done';
          } else if (detail.isOverdue === true) {
            statusText = ' · date has passed';
          }

          return (
            <article key={goal.id} className="rounded-[22px] border border-line bg-surface p-6 shadow-card sm:p-7">

              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="font-display text-[24px] leading-tight tracking-[-0.01em]">
                    {goal.name}
                  </h3>
                  <p className="mt-1.5 text-[13px] text-muted">
                    {formatRupees(goal.savedAmount)} of {formatRupees(goal.targetAmount)}
                    {statusText}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEditing(goal)}
                    className="sweep text-[13px] font-medium text-muted transition-colors hover:text-ink"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(goal.id)}
                    className="sweep text-[13px] font-medium text-muted transition-colors hover:text-clay"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="mt-6 h-2 overflow-hidden rounded-full bg-paperDeep">
                <div
                  className={'h-full rounded-full transition-[width] duration-700 ease-smooth ' + barColour}
                  style={{ width: detail.percentDone + '%' }}
                />
              </div>

              <div className="mt-5 flex flex-wrap items-baseline justify-between gap-4 border-t border-lineSoft pt-5">
                <div>
                  <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">
                    Still to find
                  </p>
                  <p className="tnum mt-1.5 font-display text-[22px] leading-none">
                    {formatRupees(detail.remaining)}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">
                    Every month
                  </p>
                  <p className="tnum mt-1.5 font-display text-[22px] leading-none text-accent">
                    {formatRupees(detail.monthlyNeeded)}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </AppShell>
  );
}
