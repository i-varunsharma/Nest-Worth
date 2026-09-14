import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import AppShell from '../components/app/AppShell';
import FamilyForm from '../components/app/FamilyForm';
import FamilyMemberCard from '../components/app/FamilyMemberCard';
import Button from '../components/shared/Button';
import { SkeletonPage } from '../components/shared/Skeleton';
import * as api from '../lib/api';
import { formatRupees } from '../lib/plan';
import { loadFinances } from '../lib/loadFinances';
import { runShock, verdictSentence } from '../lib/shocks';

/*
  The screen at /family. The people this salary supports, by name.

  This is what makes Nestworth different from a budgeting app. Most plans start
  from "your income". For many Indian households a large part of that income was
  never really theirs: it goes to parents, a sibling's college, a grandparent's
  medicines. Listing those people replaces the plan's estimate with real amounts,
  and tells the stress test who a hospital bill would land on.

  Props:
    user - the signed-in person, handed down by RequireAuth
*/

// The bill used for the health cover warning. The same default as the stress test.
const WARNING_BILL = 300000;

export default function FamilyPage({ user }) {
  const [loaded, setLoaded] = useState(null);
  const [loadError, setLoadError] = useState('');

  // Which form is open: null, 'new', or the person being edited.
  const [editing, setEditing] = useState(null);

  // After a change, fetch again so the page matches the database rather than
  // guessing what it now holds.
  const reload = async () => {
    const result = await loadFinances();

    if (result.ok === true) {
      setLoaded(result);
    } else {
      setLoadError(result.error);
    }
  };

  useEffect(() => {
    // Guards against the answer arriving after the page has been left.
    let stillMounted = true;

    loadFinances().then((result) => {
      if (stillMounted === false) {
        return;
      }

      if (result.ok === true) {
        setLoaded(result);
      } else {
        setLoadError(result.error);
      }
    });

    return () => {
      stillMounted = false;
    };
  }, []);

  const handleAdd = async (values) => {
    const result = await api.addFamilyMember(values);

    if (result.ok === true) {
      setEditing(null);
      await reload();
    }

    return result;
  };

  const handleUpdate = async (values) => {
    const result = await api.updateFamilyMember(editing.id, values);

    if (result.ok === true) {
      setEditing(null);
      await reload();
    }

    return result;
  };

  const handleDelete = async (id) => {
    await api.deleteFamilyMember(id);
    await reload();
  };

  if (loadError) {
    return (
      <AppShell user={user} title="Family">
        <p className="text-[14.5px] text-clay">{loadError}</p>
      </AppShell>
    );
  }

  if (loaded === null) {
    return (
      <AppShell user={user} title="Family">
        <SkeletonPage label="Loading your family" stats={3} cards={2} />
      </AppShell>
    );
  }

  // The plan is built from the onboarding answers, so those come first.
  if (loaded.finances === null) {
    return <Navigate to="/onboarding" replace />;
  }

  const finances = loaded.finances;
  const family = loaded.family;
  const income = finances.plan.income;

  let shareOfIncome = 0;
  if (income > 0) {
    shareOfIncome = Math.round((finances.plan.support / income) * 100);
  }

  /*
    The health cover warning: what a hospital bill would do, for the first
    person without cover. Worked out with the same function the stress test
    page uses.
  */
  let coverWarning = null;

  if (finances.family.withoutCover.length > 0) {
    const person = finances.family.withoutCover[0];

    const bill = runShock({
      finances: finances,
      family: family,
      shock: { type: 'medical', amount: WARNING_BILL },
    });

    const othersWithout = finances.family.withoutCover.length - 1;

    let othersText = '';
    if (othersWithout === 1) {
      othersText = '1 more person has no cover either.';
    } else if (othersWithout > 1) {
      othersText = othersWithout + ' more people have no cover either.';
    }

    coverWarning = {
      name: person.name,
      othersText: othersText,
      sentence: verdictSentence(bill),
      verdict: bill.verdict,
    };
  }

  // See DebtsPage for why the form needs a key that changes with its target.
  let formKey = 'new';
  let memberBeingEdited = null;

  if (editing !== null && editing !== 'new') {
    formKey = 'member-' + editing.id;
    memberBeingEdited = editing;
  }

  let formSaveHandler = handleUpdate;
  if (editing === 'new') {
    formSaveHandler = handleAdd;
  }

  const addButton = (
    <Button onClick={() => setEditing('new')} variant="accent">
      Add a person
    </Button>
  );

  let headerAction = null;
  if (editing === null) {
    headerAction = addButton;
  }

  let warningClasses = 'border-brass/25 bg-brassSoft';
  if (coverWarning !== null && coverWarning.verdict === 'breaks') {
    warningClasses = 'border-clay/25 bg-claySoft';
  }

  return (
    <AppShell
      user={user}
      title="Family"
      subtitle="The people your salary carries. Real amounts here replace the estimate in your plan."
      action={headerAction}
    >

      {editing !== null ? (
        <div className="mb-8">
          <FamilyForm
            key={formKey}
            member={memberBeingEdited}
            onSave={formSaveHandler}
            onCancel={() => setEditing(null)}
          />
        </div>
      ) : null}

      {/* ---------- Nobody listed yet ---------- */}
      {family.length === 0 && editing === null ? (
        <div className="rounded-[22px] border border-dashed border-line bg-surface/50 p-10 text-center">
          <p className="font-display text-[22px] leading-snug">Who does your salary support?</p>
          <p className="mx-auto mt-3 max-w-md text-[14.5px] leading-relaxed text-ink2">
            Right now your plan guesses{' '}
            <span className="tnum font-semibold text-ink">{formatRupees(finances.plan.support)}</span>{' '}
            a month for {loaded.household.dependents} people. Add each person with what you really
            send, and the plan, the safety net and the stress test all use the real figure.
          </p>
          <div className="mt-7 flex justify-center">{addButton}</div>
        </div>
      ) : null}

      {/* ---------- The summary ---------- */}
      {family.length > 0 ? (
        <div className="mb-6 grid gap-5 rounded-[22px] border border-line bg-surface p-6 shadow-card sm:grid-cols-3 sm:p-7">
          <div>
            <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">Every month</p>
            <p className="tnum mt-1.5 font-display text-[26px] leading-none">
              {formatRupees(finances.plan.support)}
            </p>
          </div>

          <div>
            <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">Share of income</p>
            <p className="tnum mt-1.5 font-display text-[26px] leading-none">{shareOfIncome}%</p>
          </div>

          <div>
            <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">People</p>
            <p className="tnum mt-1.5 font-display text-[26px] leading-none">{family.length}</p>
          </div>
        </div>
      ) : null}

      {/* ---------- Health cover warning ---------- */}
      {coverWarning !== null ? (
        <div className={'mb-6 rounded-[22px] border p-5 sm:p-6 ' + warningClasses}>
          <p className="text-[14.5px] leading-relaxed text-ink2">
            <span className="font-semibold text-ink">{coverWarning.name} has no health cover.</span>{' '}
            If a {formatRupees(WARNING_BILL)} hospital bill arrived this month: {coverWarning.sentence}
          </p>

          {coverWarning.othersText !== '' ? (
            <p className="mt-2 text-[13px] text-muted">{coverWarning.othersText}</p>
          ) : null}

          <Link to="/stress-test" className="sweep mt-3 inline-block text-[13.5px] font-semibold text-ink">
            Try other amounts in the stress test
          </Link>
        </div>
      ) : null}

      {/* ---------- One card per person ---------- */}
      <div className="grid gap-5 md:grid-cols-2">
        {family.map((member) => {
          let memberShare = 0;
          if (income > 0) {
            memberShare = Math.round((member.monthlySupport / income) * 100);
          }

          return (
            <FamilyMemberCard
              key={member.id}
              member={member}
              shareOfIncome={memberShare}
              onEdit={() => setEditing(member)}
              onDelete={() => handleDelete(member.id)}
            />
          );
        })}
      </div>
    </AppShell>
  );
}
