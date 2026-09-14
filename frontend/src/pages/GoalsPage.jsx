import AppShell from '../components/layout/AppShell';
import { PageError, PageLoading } from '../components/layout/PageStatus';
import GoalCard from '../components/goals/GoalCard';
import GoalForm from '../components/goals/GoalForm';
import GoalsFitNotice from '../components/goals/GoalsFitNotice';
import Button from '../components/shared/Button';
import EmptyState from '../components/shared/EmptyState';
import useAsyncData from '../hooks/useAsyncData';
import useRecordEditor from '../hooks/useRecordEditor';
import * as api from '../lib/api';
import { loadFinances } from '../lib/loadFinances';
import { bucketAmount } from '../lib/plan';

/*
  /goals: what is being saved for, what each goal needs a month, and whether all
  of them together fit inside what the plan saves.
*/

const TITLE = 'Goals';

// The goals, plus the plan's monthly saving to judge them against.
async function loadGoalsPage() {
  const [goals, finances] = await Promise.all([api.getGoals(), loadFinances()]);

  if (goals.ok === false) {
    return goals;
  }
  if (finances.ok === false) {
    return finances;
  }

  let monthlySaving = 0;
  if (finances.data.finances !== null) {
    monthlySaving = bucketAmount(finances.data.finances.plan, 'save');
  }

  return { ok: true, data: { goals: goals.data.goals, monthlySaving: monthlySaving } };
}

export default function GoalsPage({ user }) {
  const page = useAsyncData(loadGoalsPage);

  const editor = useRecordEditor({
    add: api.addGoal,
    update: api.updateGoal,
    remove: api.deleteGoal,
    onChanged: page.reload,
  });

  if (page.error) {
    return <PageError user={user} title={TITLE} message={page.error} />;
  }

  if (page.data === null) {
    return <PageLoading user={user} title={TITLE} label="Loading your goals" stats={3} cards={2} />;
  }

  const goals = page.data.goals;

  const addButton = (
    <Button onClick={editor.startAdding} variant="accent">
      Add a goal
    </Button>
  );

  let headerAction = null;
  if (editor.isOpen === false) {
    headerAction = addButton;
  }

  return (
    <AppShell
      user={user}
      title={TITLE}
      subtitle="What you are saving for, and what each one costs you every month."
      action={headerAction}
    >
      {editor.isOpen === true ? (
        <div className="mb-8">
          <GoalForm key={editor.formKey} goal={editor.record} onSave={editor.save} onCancel={editor.close} />
        </div>
      ) : null}

      {goals.length === 0 && editor.isOpen === false ? (
        <EmptyState title="No goals yet." action={addButton}>
          An emergency fund is the one worth starting with. Six months of costs, sitting somewhere boring, is
          what stops a bad month becoming a bad year.
        </EmptyState>
      ) : null}

      {goals.length > 0 ? <GoalsFitNotice goals={goals} monthlySaving={page.data.monthlySaving} /> : null}

      <div className="space-y-5">
        {goals.map((goal) => {
          return (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={() => editor.startEditing(goal)}
              onDelete={() => editor.remove(goal.id)}
            />
          );
        })}
      </div>
    </AppShell>
  );
}
