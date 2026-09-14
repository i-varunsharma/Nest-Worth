import { useState } from 'react';
import MonthFigures from './MonthFigures';
import SpendingBreakdown from './SpendingBreakdown';
import TransactionTable from './TransactionTable';
import Notice from '../shared/Notice';
import { SkeletonPage } from '../shared/Skeleton';
import useAsyncData from '../../hooks/useAsyncData';
import * as api from '../../lib/api';

/*
  One month of transactions: totals, the breakdown and every line. Loads again
  whenever the month changes, and after a category is corrected, so the totals
  always come from the server's own rules.
*/

async function loadMonth(month) {
  const [summary, transactions] = await Promise.all([api.getSpendingSummary(month), api.getTransactions(month)]);

  if (summary.ok === false) {
    return summary;
  }
  if (transactions.ok === false) {
    return transactions;
  }

  return { ok: true, data: { summary: summary.data.summary, transactions: transactions.data.transactions } };
}

export default function MonthDetail({ month }) {
  const monthData = useAsyncData(loadMonth, month);
  const [savingId, setSavingId] = useState(0);
  const [saveError, setSaveError] = useState('');

  if (monthData.error) {
    return <Notice tone="error" className="mt-6">{monthData.error}</Notice>;
  }

  // Also shown while switching months, because the old month's data belongs to a different key.
  if (monthData.data === null || monthData.data.summary.month !== month) {
    return (
      <div className="mt-6">
        <SkeletonPage label="Loading this month" stats={4} cards={1} />
      </div>
    );
  }

  const handleCategoryChange = async (transaction, category) => {
    setSavingId(transaction.id);
    setSaveError('');

    const result = await api.setTransactionCategory(transaction.id, category);

    setSavingId(0);

    if (result.ok === false) {
      setSaveError(result.error);
      return;
    }

    monthData.reload();
  };

  return (
    <>
      <MonthFigures summary={monthData.data.summary} />
      <SpendingBreakdown summary={monthData.data.summary} />
      <Notice tone="error" className="mt-6">{saveError}</Notice>
      <TransactionTable
        transactions={monthData.data.transactions}
        savingId={savingId}
        onCategoryChange={handleCategoryChange}
      />
    </>
  );
}
