import AppShell from '../components/layout/AppShell';
import { PageError, PageLoading } from '../components/layout/PageStatus';
import DebtCard from '../components/debts/DebtCard';
import DebtForm from '../components/debts/DebtForm';
import DebtSummary from '../components/debts/DebtSummary';
import Button from '../components/shared/Button';
import EmptyState from '../components/shared/EmptyState';
import useAsyncData from '../hooks/useAsyncData';
import useRecordEditor from '../hooks/useRecordEditor';
import * as api from '../lib/api';
import { orderByRate } from '../lib/debt';

/*
  /debts: every debt, highest interest rate first, because that is the cheapest
  order to clear them in. Each card has a slider showing what paying extra does.
*/

const TITLE = 'Debts';

export default function DebtsPage({ user }) {
  const page = useAsyncData(api.getDebts);

  const editor = useRecordEditor({
    add: api.addDebt,
    update: api.updateDebt,
    remove: api.deleteDebt,
    onChanged: page.reload,
  });

  if (page.error) {
    return <PageError user={user} title={TITLE} message={page.error} />;
  }

  if (page.data === null) {
    return <PageLoading user={user} title={TITLE} label="Loading your debts" stats={3} cards={2} />;
  }

  const debts = orderByRate(page.data.debts);

  const addButton = (
    <Button onClick={editor.startAdding} variant="accent">
      Add a debt
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
      subtitle="Ordered by interest rate, because that is the cheapest order to clear them in."
      action={headerAction}
    >
      {editor.isOpen === true ? (
        <div className="mb-8">
          <DebtForm key={editor.formKey} debt={editor.record} onSave={editor.save} onCancel={editor.close} />
        </div>
      ) : null}

      {debts.length === 0 && editor.isOpen === false ? (
        <EmptyState title="No debts recorded." action={addButton}>
          If you have an education loan, a car loan or a card balance, add it here. Knowing the rate and the
          EMI is what turns a vague worry into a date.
        </EmptyState>
      ) : null}

      {debts.length > 0 ? <DebtSummary debts={debts} /> : null}

      <div className="space-y-5">
        {debts.map((debt, index) => {
          return (
            <DebtCard
              key={debt.id}
              debt={debt}
              isPriority={index === 0 && debts.length > 1}
              onEdit={() => editor.startEditing(debt)}
              onDelete={() => editor.remove(debt.id)}
            />
          );
        })}
      </div>
    </AppShell>
  );
}
