import { useState } from 'react';
import AppShell from '../components/layout/AppShell';
import { PageError, PageLoading } from '../components/layout/PageStatus';
import Card from '../components/shared/Card';
import Overline from '../components/shared/Overline';
import PillGroup from '../components/shared/PillGroup';
import MonthDetail from '../components/spending/MonthDetail';
import StatementImport from '../components/spending/StatementImport';
import useAsyncData from '../hooks/useAsyncData';
import * as api from '../lib/api';
import { monthLabel } from '../lib/checkins';

/*
  /spending: what a bank statement says really happened, sorted into categories.
  The totals and shares are worked out on the server; this page only draws them.
*/

const TITLE = 'Spending.';

export default function SpendingPage({ user }) {
  const months = useAsyncData(api.getTransactionMonths);

  // The month somebody picked. Empty means "the newest one".
  const [pickedMonth, setPickedMonth] = useState('');
  const [removeError, setRemoveError] = useState('');

  if (months.error) {
    return <PageError user={user} title={TITLE} message={months.error} />;
  }

  if (months.data === null) {
    return <PageLoading user={user} title={TITLE} label="Loading your spending" stats={4} cards={2} />;
  }

  const monthList = months.data.months;

  // After an import, open the month the file was for, which is not always the newest.
  const handleImported = (importedMonths) => {
    if (importedMonths.length > 0) {
      setPickedMonth(importedMonths[importedMonths.length - 1]);
    }
    months.reload();
  };

  if (monthList.length === 0) {
    return (
      <AppShell user={user} title={TITLE} subtitle="Everywhere else in this app you tell it what happened. Here your bank does.">
        <StatementImport onImported={handleImported} />

        <Card size="section" className="mt-6">
          <Overline>What happens to the file</Overline>
          <ul className="mt-4 space-y-2.5 text-[14px] leading-relaxed text-ink2">
            <li>Every line is sorted into a category by matching the merchant name.</li>
            <li>A merchant nobody has written a rule for says so, rather than guessing.</li>
            <li>Investing and transfers are kept out of the spending total, because neither is money spent.</li>
            <li>Importing the same file twice adds nothing the second time.</li>
          </ul>
        </Card>
      </AppShell>
    );
  }

  // A picked month that no longer exists (it was just removed) falls back to the newest.
  let month = monthList[0].month;

  for (const entry of monthList) {
    if (entry.month === pickedMonth) {
      month = pickedMonth;
    }
  }

  const handleRemoveMonth = async () => {
    const isSure = window.confirm(
      'Remove every transaction imported for ' + monthLabel(month) + '? You can import the statement again afterwards.',
    );

    if (isSure === false) {
      return;
    }

    const result = await api.deleteTransactionMonth(month);

    if (result.ok === false) {
      setRemoveError(result.error);
      return;
    }

    setRemoveError('');
    setPickedMonth('');
    months.reload();
  };

  const monthOptions = monthList.map((entry) => {
    return { key: entry.month, label: monthLabel(entry.month), detail: String(entry.lines) };
  });

  return (
    <AppShell
      user={user}
      title={TITLE}
      subtitle={monthLabel(month) + ', from your bank statement'}
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
      <PillGroup options={monthOptions} selectedKey={month} onSelect={setPickedMonth} />

      {removeError ? <p role="alert" className="mt-4 text-[13.5px] text-clay">{removeError}</p> : null}

      <MonthDetail month={month} />

      <div className="mt-6">
        <StatementImport onImported={handleImported} />
      </div>
    </AppShell>
  );
}
