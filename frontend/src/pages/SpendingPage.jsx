import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../components/app/AppShell';
import StatementImport from '../components/app/StatementImport';
import CategoryBars from '../components/charts/CategoryBars';
import CountUp from '../components/shared/CountUp';
import { SkeletonPage } from '../components/shared/Skeleton';
import useReveal from '../hooks/useReveal';
import * as api from '../lib/api';
import { formatRupees } from '../lib/plan';
import { ALL_CATEGORIES } from '../lib/categories';

/*
  The screen at /spending: what a bank statement says actually happened.

  Every other page in this app is built from numbers somebody typed. This one is
  built from their bank's own record, which is the only place the difference
  between the plan and the month can come from honestly. Nobody remembers what
  they spent on food; everybody's statement knows.

  The page does almost no arithmetic. The totals and the shares are worked out
  in SQL on the server, because the answer is a handful of numbers and the rows
  are only the raw material. See the summary route in backend/routes.

  Props:
    user - the signed-in person, handed down by RequireAuth
*/

export default function SpendingPage({ user }) {
  // null means "still finding out", which is different from an empty list.
  const [months, setMonths] = useState(null);
  const [chosenMonth, setChosenMonth] = useState('');

  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loadError, setLoadError] = useState('');

  // Which line is being saved, so its dropdown can be held while it happens.
  const [savingId, setSavingId] = useState(0);

  const [chartRef, isChartVisible] = useReveal();

  /*
    Step one: which months have anything in them.

    Separate from loading a month because the answer decides whether there is a
    month to load at all, and because it has to be asked again after an import
    brings a new one in.

    It hands the list back rather than putting it into state itself. The two
    callers want different things from it: the one below opens the newest month,
    and the one after an import opens whichever month the file was for.
  */
  const fetchMonths = async () => {
    const response = await api.getTransactionMonths();

    if (response.ok === false) {
      setLoadError(response.error);
      return [];
    }

    return response.data.months;
  };

  useEffect(() => {
    let stillMounted = true;

    const load = async () => {
      const found = await fetchMonths();

      if (stillMounted === false) {
        return;
      }

      setMonths(found);

      // Newest first from the server, so the first row is the one to open.
      if (found.length > 0) {
        setChosenMonth(found[0].month);
      }
    };

    load();

    return () => {
      stillMounted = false;
    };
  }, []);

  /*
    Step two: the chosen month, whenever it changes.

    The summary and the list are fetched together rather than one after the
    other, because neither depends on the other and queueing them would make
    the page twice as slow for no reason.
  */
  useEffect(() => {
    if (chosenMonth === '') {
      return;
    }

    let stillMounted = true;

    const load = async () => {
      const [summaryResponse, listResponse] = await Promise.all([
        api.getSpendingSummary(chosenMonth),
        api.getTransactions(chosenMonth),
      ]);

      if (stillMounted === false) {
        return;
      }

      if (summaryResponse.ok === false) {
        setLoadError(summaryResponse.error);
        return;
      }

      setSummary(summaryResponse.data.summary);

      if (listResponse.ok === true) {
        setTransactions(listResponse.data.transactions);
      }
    };

    load();

    /*
      Switching months quickly can leave an older request still in flight. This
      flag means its answer is thrown away when it lands instead of overwriting
      the month now on screen.
    */
    return () => {
      stillMounted = false;
    };
  }, [chosenMonth]);


  // ---------------------------------------------------------------
  // Correcting a category
  // ---------------------------------------------------------------

  const handleCategoryChange = async (transaction, newCategory) => {
    setSavingId(transaction.id);

    const response = await api.setTransactionCategory(transaction.id, newCategory);

    setSavingId(0);

    if (response.ok === false) {
      setLoadError(response.error);
      return;
    }

    /*
      The list is rebuilt as a NEW array with one row replaced, rather than the
      old row being edited where it sits. React decides whether to redraw by
      checking whether the value it was given is a different object from last
      time, so changing a row inside the existing array would change nothing on
      screen.
    */
    const updated = transactions.map((row) => {
      if (row.id === transaction.id) {
        return response.data.transaction;
      }

      return row;
    });

    setTransactions(updated);

    // The totals moved, so they have to be asked for again. Adding it up here
    // would be a second copy of the server's rules, and the two would drift.
    const refreshed = await api.getSpendingSummary(chosenMonth);

    if (refreshed.ok === true) {
      setSummary(refreshed.data.summary);
    }
  };


  // ---------------------------------------------------------------
  // Throwing a month away
  // ---------------------------------------------------------------

  const handleRemoveMonth = async () => {
    const sure = window.confirm(
      'Remove every transaction imported for ' + monthName(chosenMonth) + '? '
      + 'You can import the statement again afterwards.',
    );

    if (sure === false) {
      return;
    }

    const response = await api.deleteTransactionMonth(chosenMonth);

    if (response.ok === false) {
      setLoadError(response.error);
      return;
    }

    setSummary(null);
    setTransactions([]);
    setChosenMonth('');

    const found = await fetchMonths();

    setMonths(found);

    if (found.length > 0) {
      setChosenMonth(found[0].month);
    }
  };


  const handleImported = async (importedMonths) => {
    const found = await fetchMonths();

    setMonths(found);

    // Open the month the file was actually for, which is not always the newest
    // one: somebody catching up imports last March after this August.
    if (importedMonths.length > 0) {
      setChosenMonth(importedMonths[importedMonths.length - 1]);
    }
  };


  // ---------------------------------------------------------------
  // What to draw
  // ---------------------------------------------------------------

  if (loadError) {
    return (
      <AppShell user={user} title="Spending">
        <p className="text-[14.5px] text-clay">{loadError}</p>
      </AppShell>
    );
  }

  if (months === null) {
    return (
      <AppShell user={user} title="Spending">
        <SkeletonPage label="Loading your spending" stats={4} cards={2} />
      </AppShell>
    );
  }

  // Nothing imported yet. The import box IS the page.
  if (months.length === 0) {
    return (
      <AppShell
        user={user}
        title="Spending."
        subtitle="Everywhere else in this app you tell it what happened. Here your bank does."
      >
        <StatementImport onImported={handleImported} />

        <div className="mt-6 rounded-[18px] border border-line bg-surface p-6 shadow-card">
          <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">
            What happens to the file
          </p>

          <ul className="mt-4 space-y-2.5 text-[14px] leading-relaxed text-ink2">
            <li>Every line is sorted into a category by matching the merchant name.</li>
            <li>A merchant nobody has written a rule for says so, rather than guessing.</li>
            <li>Investing and transfers are kept out of the spending total, because neither is money spent.</li>
            <li>Importing the same file twice adds nothing the second time.</li>
          </ul>
        </div>
      </AppShell>
    );
  }

  /*
    The month itself, or its skeleton while it is still arriving.

    Worked out here rather than as a question mark inside the markup below. The
    two branches are a hundred lines apart, and a reader hunting for the end of
    one of them is reading brackets instead of the page.
  */
  /*
    The check-in page can be opened with this month already filled in.

    The figures are rounded to whole rupees because a check-in is a rough
    record, not an accounts ledger, and "64381.4" in a box invites somebody to
    correct a decimal place that was never going to matter.

    Saving is still a separate press. A statement usually misses something,
    rent paid in cash most often, so this is a starting point rather than an
    answer.
  */
  let checkInLink = '/check-in';

  if (summary !== null) {
    checkInLink = '/check-in'
      + '?month=' + summary.month
      + '&income=' + Math.round(summary.income)
      + '&spent=' + Math.round(summary.spent)
      + '&invested=' + Math.round(summary.putAway);
  }

  /*
    How many lines the rules could not place. Written out as a whole sentence
    here so the markup does not have to choose between "1 lines" and "1 line"
    in the middle of a paragraph.
  */
  let attentionNote = '';

  if (summary !== null && summary.needingAttention > 0) {
    if (summary.needingAttention === 1) {
      attentionNote = 'One line could not be matched to a merchant and is sitting in '
        + '"everything else". Setting it below moves it into the right bar.';
    } else {
      attentionNote = summary.needingAttention + ' lines could not be matched to a merchant '
        + 'and are sitting in "everything else". Setting them below moves them into the '
        + 'right bar.';
    }
  }

  let monthBody = (
    <div className="mt-6">
      <SkeletonPage label="Loading this month" stats={4} cards={1} />
    </div>
  );

  if (summary !== null) {
    monthBody = (
      <>
        {/* ---------- The four numbers ---------- */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Figure label="Came in" amount={summary.income} note="salary and anything else" />
          <Figure label="Spent" amount={summary.spent} note={summary.lines + ' lines read'} />
          <Figure label="Put away" amount={summary.putAway} note="investing, not spending" />
          <Figure
            label="Kept"
            amount={summary.kept}
            note="what was left of the money that came in"
            isNegative={summary.kept < 0}
          />
        </div>

        {/* ---------- Where it went ---------- */}
        <div
          ref={chartRef}
          className="mt-6 rounded-[18px] border border-line bg-surface p-6 shadow-card"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">
              Where it went
            </p>

            <Link
              to={checkInLink}
              className="sweep text-[13px] font-medium text-muted transition-colors hover:text-ink"
            >
              Record this month &#8594;
            </Link>
          </div>

          <div className="mt-6">
            <CategoryBars categories={summary.categories} isVisible={isChartVisible} />
          </div>

          {attentionNote ? (
            <p className="mt-6 border-t border-lineSoft pt-4 text-[13px] leading-relaxed text-muted">
              {attentionNote}
            </p>
          ) : null}
        </div>

        {/* ---------- Every line ---------- */}
        <div className="mt-6 rounded-[18px] border border-line bg-surface p-6 shadow-card">
          <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">
            Every line, and what it was filed as
          </p>

          <p className="mt-3 text-[13.5px] leading-relaxed text-ink2">
            Change any of these and the bars above follow. A category you set
            yourself is never overwritten by a later guess.
          </p>

          {/* The table scrolls inside its own box on a narrow screen rather
              than making the whole page scroll sideways. */}
          <div className="mt-5 -mx-2 overflow-x-auto px-2">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line">
                  <th className="pb-2.5 pr-4 text-2xs font-semibold uppercase tracking-widest2 text-muted">Date</th>
                  <th className="pb-2.5 pr-4 text-2xs font-semibold uppercase tracking-widest2 text-muted">What the bank called it</th>
                  <th className="pb-2.5 pr-4 text-right text-2xs font-semibold uppercase tracking-widest2 text-muted">Amount</th>
                  <th className="pb-2.5 text-2xs font-semibold uppercase tracking-widest2 text-muted">Filed as</th>
                </tr>
              </thead>

              <tbody>
                {transactions.map((row) => {
                  // Money arriving is written in the accent, money leaving in
                  // the ordinary ink, so a salary stands out from a payment.
                  let amountColour = 'text-ink';
                  let sign = '';

                  if (row.direction === 'credit') {
                    amountColour = 'text-accent';
                    sign = '+';
                  }

                  return (
                    <tr key={row.id} className="border-b border-lineSoft last:border-0">
                      <td className="tnum py-3 pr-4 align-middle text-[13px] text-muted">
                        {row.occurredOn.slice(8)} {monthShort(row.occurredOn)}
                      </td>

                      {/* Cut off with an ellipsis, because a bank narration can
                          be sixty characters of routing reference. title is the
                          browser's own tooltip, so the whole line is still one
                          hover away. */}
                      <td
                        title={row.description}
                        className="max-w-[240px] truncate py-3 pr-4 align-middle text-[13.5px] text-ink2"
                      >
                        {row.description}
                      </td>

                      <td className={'tnum py-3 pr-4 text-right align-middle text-[13.5px] font-semibold ' + amountColour}>
                        {sign}{formatRupees(row.amount)}
                      </td>

                      <td className="py-3 align-middle">
                        <select
                          value={row.category}
                          disabled={savingId === row.id}
                          onChange={(event) => handleCategoryChange(row, event.target.value)}
                          className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-[13px] text-ink transition-colors hover:border-ink focus:border-accent disabled:opacity-50"
                        >
                          {ALL_CATEGORIES.map((category) => {
                            return (
                              <option key={category.key} value={category.key}>
                                {category.label}
                              </option>
                            );
                          })}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  }

  return (
    <AppShell
      user={user}
      title="Spending."
      subtitle={monthName(chosenMonth) + ', from your bank statement'}
      action={
        <button
          type="button"
          onClick={handleRemoveMonth}
          className="rounded-full border border-line px-5 py-2.5 text-[13.5px] font-semibold text-muted transition-all duration-300 ease-smooth hover:border-clay hover:text-clay"
        >
          Remove this month
        </button>
      }
    >
      {/* ---------- Which month ---------- */}
      <div className="flex flex-wrap gap-2">
        {months.map((entry) => {
          let pillClasses = 'rounded-full border px-4 py-2 text-[13px] font-semibold '
            + 'transition-all duration-300 ease-smooth ';

          if (entry.month === chosenMonth) {
            pillClasses = pillClasses + 'border-accent bg-accent text-paper';
          } else {
            pillClasses = pillClasses + 'border-line bg-surface text-ink2 hover:border-ink';
          }

          return (
            <button
              key={entry.month}
              type="button"
              onClick={() => setChosenMonth(entry.month)}
              className={pillClasses}
            >
              {monthName(entry.month)}
              <span className="ml-2 font-normal opacity-70">{entry.lines}</span>
            </button>
          );
        })}
      </div>

      {monthBody}

      {/* ---------- Add another month ---------- */}
      <div className="mt-6">
        <StatementImport onImported={handleImported} />
      </div>
    </AppShell>
  );
}


/*
  One of the four numbers across the top. Its own small component because the
  same shape is used four times and a copied block of markup drifts.
*/
function Figure({ label, amount, note, isNegative }) {
  let valueColour = 'text-accent';

  if (isNegative === true) {
    valueColour = 'text-clay';
  }

  return (
    <div className="rounded-[18px] border border-line bg-surface p-5 shadow-card">
      <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">{label}</p>

      <p className={'tnum mt-2.5 font-display text-[26px] leading-none ' + valueColour}>
        <CountUp
          to={amount}
          format={(value) => {
            return formatRupees(value, { short: true });
          }}
        />
      </p>

      <p className="mt-2 text-2xs text-muted">{note}</p>
    </div>
  );
}


/* '2026-08' as 'August 2026'. The day is invented because Date needs one. */
function monthName(month) {
  if (!month) {
    return '';
  }

  const asDate = new Date(month + '-01T00:00:00');

  return asDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}


/* '2026-08-14' as 'Aug'. Used in the date column, where the year is already
   in the heading above. */
function monthShort(day) {
  const asDate = new Date(day + 'T00:00:00');

  return asDate.toLocaleDateString('en-IN', { month: 'short' });
}
