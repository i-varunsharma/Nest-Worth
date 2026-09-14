import { Navigate } from 'react-router-dom';
import AppShell from '../components/layout/AppShell';
import { PageError, PageLoading } from '../components/layout/PageStatus';
import FamilyForm from '../components/family/FamilyForm';
import FamilyMemberCard from '../components/family/FamilyMemberCard';
import FamilySummary from '../components/family/FamilySummary';
import HealthCoverWarning from '../components/family/HealthCoverWarning';
import Button from '../components/shared/Button';
import EmptyState from '../components/shared/EmptyState';
import useAsyncData from '../hooks/useAsyncData';
import useRecordEditor from '../hooks/useRecordEditor';
import * as api from '../lib/api';
import { loadFinances } from '../lib/loadFinances';
import { formatRupees } from '../lib/plan';

/*
  /family: the people this salary supports, by name.

  Listing them replaces the plan's estimate with real amounts, and tells the
  stress test who a hospital bill would land on.
*/

const TITLE = 'Family';

export default function FamilyPage({ user }) {
  const page = useAsyncData(loadFinances);

  const editor = useRecordEditor({
    add: api.addFamilyMember,
    update: api.updateFamilyMember,
    remove: api.deleteFamilyMember,
    onChanged: page.reload,
  });

  if (page.error) {
    return <PageError user={user} title={TITLE} message={page.error} />;
  }

  if (page.data === null) {
    return <PageLoading user={user} title={TITLE} label="Loading your family" stats={3} cards={2} />;
  }

  // The plan is built from the onboarding answers, so those come first.
  if (page.data.finances === null) {
    return <Navigate to="/onboarding" replace />;
  }

  const finances = page.data.finances;
  const family = page.data.family;
  const income = finances.plan.income;

  const addButton = (
    <Button onClick={editor.startAdding} variant="accent">
      Add a person
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
      subtitle="The people your salary carries. Real amounts here replace the estimate in your plan."
      action={headerAction}
    >
      {editor.isOpen === true ? (
        <div className="mb-8">
          <FamilyForm key={editor.formKey} member={editor.record} onSave={editor.save} onCancel={editor.close} />
        </div>
      ) : null}

      {family.length === 0 && editor.isOpen === false ? (
        <EmptyState title="Who does your salary support?" action={addButton}>
          Right now your plan guesses{' '}
          <span className="tnum font-semibold text-ink">{formatRupees(finances.plan.support)}</span> a month for{' '}
          {page.data.household.dependents} people. Add each person with what you really send, and the plan, the
          safety net and the stress test all use the real figure.
        </EmptyState>
      ) : null}

      {family.length > 0 ? <FamilySummary finances={finances} peopleCount={family.length} /> : null}

      <HealthCoverWarning finances={finances} family={family} />

      <div className="grid gap-5 md:grid-cols-2">
        {family.map((member) => {
          let shareOfIncome = 0;
          if (income > 0) {
            shareOfIncome = Math.round((member.monthlySupport / income) * 100);
          }

          return (
            <FamilyMemberCard
              key={member.id}
              member={member}
              shareOfIncome={shareOfIncome}
              onEdit={() => editor.startEditing(member)}
              onDelete={() => editor.remove(member.id)}
            />
          );
        })}
      </div>
    </AppShell>
  );
}
