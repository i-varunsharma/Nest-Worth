import { useEffect, useState } from 'react';
import AppShell from '../components/app/AppShell';
import DebtCard from '../components/app/DebtCard';
import DebtForm from '../components/app/DebtForm';
import Button from '../components/shared/Button';
import * as api from '../lib/api';
import { formatDuration, formatMonthYear, orderByRate, summariseDebts } from '../lib/debt';
import { formatRupees } from '../lib/plan';

/*
  DebtsPage
  ---------
  The screen at /debts. Every debt, in the order they should be cleared, each
  with its payoff date and a slider showing what paying extra would do.

  The order is not alphabetical or by size. It is highest interest rate first,
  which is called the avalanche method and is simply the cheapest order. Every
  rupee has to go somewhere, and putting it against the most expensive debt
  always saves the most interest.

  Props:
    user - the signed-in person, handed down by RequireAuth
*/

export default function DebtsPage({ user }) {
  const [debts, setDebts] = useState(null);
  const [loadError, setLoadError] = useState('');

  // Which form is open: nothing, 'new', or the debt being edited.
  const [editing, setEditing] = useState(null);

  /* Fetches the list again after any change, so the page always matches the
     database rather than trying to guess what the database now looks like. */
  const reload = async () => {
    const result = await api.getDebts();

    if (result.ok) {
      setDebts(result.data.debts);
    } else {
      setLoadError(result.error);
    }
  };

  /*
    The first load. The stillMounted flag guards against the answer arriving
    after the page has been left, which would otherwise try to update state
    that no longer exists.
  */
  useEffect(() => {
    let stillMounted = true;

    api.getDebts().then((result) => {
      if (!stillMounted) {
        return;
      }

      if (result.ok) {
        setDebts(result.data.debts);
      } else {
        setLoadError(result.error);
      }
    });

    return () => {
      stillMounted = false;
    };
  }, []);

  const handleAdd = async (values) => {
    const result = await api.addDebt(values);

    if (result.ok) {
      setEditing(null);
      await reload();
    }

    // Handing the result back lets the form show the server's message.
    return result;
  };

  const handleUpdate = async (values) => {
    const result = await api.updateDebt(editing.id, values);

    if (result.ok) {
      setEditing(null);
      await reload();
    }

    return result;
  };

  const handleDelete = async (id) => {
    await api.deleteDebt(id);
    await reload();
  };

  if (loadError) {
    return (
      <AppShell user={user} title="Debts">
        <p className="text-[14.5px] text-clay">{loadError}</p>
      </AppShell>
    );
  }

  if (debts === null) {
    return (
      <AppShell user={user} title="Debts">
        <p className="text-[14px] text-muted">Loading…</p>
      </AppShell>
    );
  }

  const summary = summariseDebts(debts);
  const ordered = orderByRate(debts);

  const addButton = (
    <Button onClick={() => setEditing('new')} variant="accent">
      Add a debt
    </Button>
  );

  return (
    <AppShell
      user={user}
      title="Debts"
      subtitle="Ordered by interest rate, because that is the cheapest order to clear them in."
      action={editing === null ? addButton : null}
    >

      {/* ---------- The form, when one is open ---------- */}
      {editing !== null ? (
        <div className="mb-8">
          <DebtForm
            debt={editing === 'new' ? null : editing}
            onSave={editing === 'new' ? handleAdd : handleUpdate}
            onCancel={() => setEditing(null)}
          />
        </div>
      ) : null}

      {/* ---------- Nothing yet ---------- */}
      {debts.length === 0 && editing === null ? (
        <div className="rounded-[22px] border border-dashed border-line bg-surface/50 p-10 text-center">
          <p className="font-display text-[22px] leading-snug">No debts recorded.</p>
          <p className="mx-auto mt-3 max-w-sm text-[14.5px] leading-relaxed text-ink2">
            If you have an education loan, a car loan or a card balance, add it here.
            Knowing the rate and the EMI is what turns a vague worry into a date.
          </p>
          <div className="mt-7 flex justify-center">{addButton}</div>
        </div>
      ) : null}

      {/* ---------- The summary across the top ---------- */}
      {debts.length > 0 ? (
        <div className="mb-8 grid gap-5 rounded-[22px] border border-line bg-surface p-6 shadow-card sm:grid-cols-4 sm:p-7">
          <div>
            <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">Total owed</p>
            <p className="tnum mt-1.5 font-display text-[26px] leading-none">
              {formatRupees(summary.totalOwed)}
            </p>
          </div>

          <div>
            <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">Every month</p>
            <p className="tnum mt-1.5 font-display text-[26px] leading-none">
              {formatRupees(summary.totalEmi)}
            </p>
          </div>

          <div>
            <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">Debt free</p>
            <p className="tnum mt-1.5 font-display text-[26px] leading-none text-accent">
              {formatMonthYear(summary.debtFreeDate)}
            </p>
            <p className="mt-1.5 text-2xs text-muted">{formatDuration(summary.longestMonths)} away</p>
          </div>

          <div>
            <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">
              Interest still to pay
            </p>
            <p className="tnum mt-1.5 font-display text-[26px] leading-none text-clay">
              {formatRupees(summary.totalInterest)}
            </p>
          </div>
        </div>
      ) : null}

      {/* ---------- One card per debt ---------- */}
      <div className="space-y-5">
        {ordered.map((debt, index) => {
          return (
            <DebtCard
              key={debt.id}
              debt={debt}
              isPriority={index === 0 && ordered.length > 1}
              onEdit={() => setEditing(debt)}
              onDelete={() => handleDelete(debt.id)}
            />
          );
        })}
      </div>
    </AppShell>
  );
}
