import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppShell from '../components/app/AppShell';
import { SkeletonPage } from '../components/shared/Skeleton';
import Button from '../components/shared/Button';
import TextField from '../components/shared/TextField';
import * as api from '../lib/api';
import { buildPlan, bucketAmount, formatRupees } from '../lib/plan';
import { summariseDebts } from '../lib/debt';
import { currentMonth, monthLabel } from '../lib/checkins';

/*
  The screen at /check-in. Once a month you write down what actually happened,
  and the page compares it against what the plan said should happen.

  This is the part that turns a calculator into something with a memory. A plan
  nobody ever checks against reality is just a nice-looking guess. After three or
  four months there is a real history here, and the pattern in it is usually more
  useful than any single month.

  It is also deliberately forgiving. Rough figures are fine, missed months are
  fine, and nothing scolds anybody. A tool that makes you feel bad is a tool you
  stop opening.

  Props:
    user - the signed-in person, handed down by RequireAuth
*/


export default function CheckInPage({ user }) {
  /*
    The spending page can send somebody here with the month already worked out
    from their bank statement, as ?month=2026-08&income=85000&spent=64381.

    useSearchParams reads the part of the address after the question mark. The
    figures only fill the boxes in; nothing is saved until the button is pressed,
    which matters because a statement rarely covers everything. Somebody paying
    rent in cash has to add it, and they can only do that if it is a starting
    point rather than an answer.
  */
  const [searchParams] = useSearchParams();

  const [checkins, setCheckins] = useState(null);
  const [plan, setPlan] = useState(null);
  const [loadError, setLoadError] = useState('');

  const [month, setMonth] = useState(() => {
    return readParam(searchParams, 'month', currentMonth());
  });

  const [income, setIncome] = useState(() => {
    return readParam(searchParams, 'income', '');
  });

  const [spent, setSpent] = useState(() => {
    return readParam(searchParams, 'spent', '');
  });

  const [saved, setSaved] = useState('');

  const [invested, setInvested] = useState(() => {
    return readParam(searchParams, 'invested', '');
  });

  const [note, setNote] = useState('');

  // What the database worked out about the months already recorded. Null until
  // it arrives, and it stays null for somebody with no history.
  const [insights, setInsights] = useState(null);

  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    // Set to false when this page is left, so a slow answer arriving afterwards
    // does not try to update state that has gone.
    let stillMounted = true;

    const load = async () => {
      const [checkinResult, householdResult, debtsResult, insightResult] = await Promise.all([
        api.getCheckins(),
        api.getHousehold(),
        api.getDebts(),
        api.getInsights(),
      ]);

      if (!stillMounted) {
        return;
      }

      if (!checkinResult.ok) {
        setLoadError(checkinResult.error);
        return;
      }

      setCheckins(checkinResult.data.checkins);

      // The summary is a bonus, not a requirement. If it fails the history
      // below still draws, so there is nothing to report here.
      if (insightResult.ok) {
        setInsights(insightResult.data.insights);
      }

      if (householdResult.ok && debtsResult.ok) {
        const debts = debtsResult.data.debts;

        const built = buildPlan({
          income: householdResult.data.household.income,
          dependents: householdResult.data.household.dependents,
          hasLoan: debts.length > 0,
          incomeVaries: householdResult.data.household.incomeVaries,
          essentialCosts: householdResult.data.household.essentialCosts,
          emi: summariseDebts(debts).totalEmi,
        });

        setPlan(built);

        // Start the income box at the planned figure, since it is usually right
        // and typing it again every month is tedious.
        setIncome(String(built.income));
      }
    };

    load();

    return () => {
      stillMounted = false;
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    setJustSaved(false);
    setIsSaving(true);

    const result = await api.saveCheckin({
      month: month,
      income: Number(income),
      spent: Number(spent),
      saved: Number(saved),
      invested: Number(invested),
      note: note,
    });

    setIsSaving(false);

    if (!result.ok) {
      setFormError(result.error);
      return;
    }

    setJustSaved(true);
    setNote('');

    const refreshed = await api.getCheckins();
    if (refreshed.ok) {
      setCheckins(refreshed.data.checkins);
    }
  };

  if (loadError) {
    return (
      <AppShell user={user} title="Check in">
        <p className="text-[14.5px] text-clay">{loadError}</p>
      </AppShell>
    );
  }

  if (checkins === null) {
    return (
      <AppShell user={user} title="Check in">
        <SkeletonPage label="Loading your check-ins" stats={3} cards={1} />
      </AppShell>
    );
  }

  // What the plan said, for the comparison column. bucketAmount returns 0 when
  // there is no plan yet, which is what this page wants while it loads.
  const plannedSpend = bucketAmount(plan, 'spend');
  const plannedSave = bucketAmount(plan, 'save');
  const plannedInvest = bucketAmount(plan, 'invest');

  let saveLabel = 'Save this month';
  if (isSaving === true) {
    saveLabel = 'Saving…';
  }

  return (
    <AppShell
      user={user}
      title="Check in"
      subtitle="What actually happened this month. Rough figures are fine, and a missed month is fine too."
    >

      <div className="grid gap-8 lg:grid-cols-[1fr_0.85fr]">

        {/* ---------- The form ---------- */}
        <form onSubmit={handleSubmit} noValidate className="rounded-[22px] border border-line bg-surface p-6 shadow-card sm:p-7">

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="month" className="mb-2 block text-[13px] font-medium text-ink2">
                Which month?
              </label>
              <input
                id="month"
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-[15px] text-ink outline-none transition-colors duration-300 focus:border-accent"
              />
            </div>

            <TextField
              id="ci-income"
              label="Income that arrived"
              type="text"
              value={income}
              onChange={setIncome}
              placeholder="62000"
              prefix="₹"
              inputMode="numeric"
            />

            <TextField
              id="ci-spent"
              label="Spent"
              type="text"
              value={spent}
              onChange={setSpent}
              placeholder={String(plannedSpend)}
              prefix="₹"
              inputMode="numeric"
              hint={plan ? 'Plan said ' + formatRupees(plannedSpend) : ''}
            />

            <TextField
              id="ci-saved"
              label="Saved"
              type="text"
              value={saved}
              onChange={setSaved}
              placeholder={String(plannedSave)}
              prefix="₹"
              inputMode="numeric"
              hint={plan ? 'Plan said ' + formatRupees(plannedSave) : ''}
            />

            <TextField
              id="ci-invested"
              label="Invested"
              type="text"
              value={invested}
              onChange={setInvested}
              placeholder={String(plannedInvest)}
              prefix="₹"
              inputMode="numeric"
              hint={plan ? 'Plan said ' + formatRupees(plannedInvest) : ''}
            />

            <TextField
              id="ci-note"
              label="Anything worth remembering?"
              type="text"
              value={note}
              onChange={setNote}
              placeholder="Sister's fees were due"
            />
          </div>

          {formError ? (
            <p className="mt-5 rounded-xl border border-clay/25 bg-claySoft px-4 py-3 text-[13.5px] text-clay">
              {formError}
            </p>
          ) : null}

          {justSaved === true ? (
            <p className="mt-5 rounded-xl border border-accent/25 bg-accentSoft px-4 py-3 text-[13.5px] text-accentDeep">
              Saved. Recording the same month again just updates it.
            </p>
          ) : null}

          <div className="mt-7">
            <Button type="submit" variant="accent" disabled={isSaving}>
              {saveLabel}
            </Button>
          </div>
        </form>

        {/* ---------- The history ---------- */}
        <div>
          <h2 className="font-display text-[26px] leading-tight tracking-[-0.01em]">
            What has happened
          </h2>

          {/*
            The summary strip. Every number in it is computed by SQL in
            lib/insights.js on the server, not by this page: the running total
            is a window function, the average skips the months with no income,
            and the best month is picked on share rather than on amount.
          */}
          <HistorySummary insights={insights} />

          {checkins.length === 0 ? (
            <p className="mt-4 text-[14.5px] leading-relaxed text-ink2">
              Nothing recorded yet. Do this once at the end of the month and by March you will
              have something worth looking at.
            </p>
          ) : (
            <div className="mt-5 space-y-4">
              {checkins.map((entry) => {
                // What was left after spending, which is the number that
                // actually tells you how the month went.
                const kept = entry.saved + entry.invested;

                let keptShare = 0;
                if (entry.income > 0) {
                  keptShare = (kept / entry.income) * 100;
                }

                return (
                  <article
                    key={entry.id}
                    className="rounded-[18px] border border-line bg-surface p-5 shadow-card"
                  >
                    <div className="flex items-baseline justify-between">
                      <p className="text-[15px] font-semibold text-ink">
                        {monthLabel(entry.month)}
                      </p>
                      <p className="tnum text-[13px] text-muted">
                        kept {Math.round(keptShare)}%
                      </p>
                    </div>

                    <div className="mt-4 flex h-1.5 overflow-hidden rounded-full bg-paperDeep">
                      <div
                        className="h-full bg-ink/25"
                        style={{ width: (entry.spent / Math.max(entry.income, 1)) * 100 + '%' }}
                      />
                      <div
                        className="h-full bg-brass"
                        style={{ width: (entry.saved / Math.max(entry.income, 1)) * 100 + '%' }}
                      />
                      <div
                        className="h-full bg-accent"
                        style={{ width: (entry.invested / Math.max(entry.income, 1)) * 100 + '%' }}
                      />
                    </div>

                    <div className="mt-3.5 flex flex-wrap gap-x-5 gap-y-1.5 text-2xs text-muted">
                      <span className="tnum">Spent {formatRupees(entry.spent)}</span>
                      <span className="tnum">Saved {formatRupees(entry.saved)}</span>
                      <span className="tnum">Invested {formatRupees(entry.invested)}</span>
                    </div>

                    {entry.note ? (
                      <p className="mt-3 border-t border-lineSoft pt-3 text-[13px] italic text-ink2">
                        {entry.note}
                      </p>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}


/*
  The strip above the history: what all these months add up to.

  It draws nothing at all until there are at least two months, because a
  "running total" and a "best month" over a single entry are not summaries, they
  are that one entry repeated in three boxes.

  Props:
    insights - the object from GET /api/insights, or null while it loads
*/
function HistorySummary({ insights }) {
  if (insights === null) {
    return null;
  }

  if (insights.summary.monthsRecorded < 2) {
    return null;
  }

  const summary = insights.summary;

  // The last month in the list carries the running total of everything kept,
  // which is what a window function in SQL put there.
  const latest = insights.months[insights.months.length - 1];

  const boxes = [
    {
      label: 'Kept in total',
      value: formatRupees(latest.keptRunningTotal, { short: true }),
      note: 'across ' + summary.monthsRecorded + ' months',
    },
    {
      label: 'Average kept',
      value: summary.averageKeptPercent + '%',
      note: 'of what you earned',
    },
  ];

  if (insights.bestMonth) {
    boxes.push({
      label: 'Best month',
      value: monthLabel(insights.bestMonth.month),
      note: insights.bestMonth.keptPercent + '% kept',
    });
  }

  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-3">
      {boxes.map((box) => {
        return (
          <div key={box.label} className="rounded-[18px] border border-line bg-surface p-4">
            <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">
              {box.label}
            </p>
            <p className="tnum mt-2 font-display text-[22px] leading-none text-accent">
              {box.value}
            </p>
            <p className="mt-1.5 text-2xs text-muted">{box.note}</p>
          </div>
        );
      })}
    </div>
  );
}


/*
  Reads one value out of the address bar, or returns the fallback.

  Everything in a URL is text somebody can edit, so nothing here is trusted:
  the values only ever land in a form box, and the server checks them again when
  the form is submitted.
*/
function readParam(searchParams, name, fallback) {
  const value = searchParams.get(name);

  if (value === null || value === '') {
    return fallback;
  }

  return value;
}
