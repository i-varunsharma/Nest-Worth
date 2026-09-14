import AppShell from '../components/layout/AppShell';
import { PageError, PageLoading } from '../components/layout/PageStatus';
import AssetForm from '../components/netWorth/AssetForm';
import AssetList from '../components/netWorth/AssetList';
import NetWorthHeadline from '../components/netWorth/NetWorthHeadline';
import Button from '../components/shared/Button';
import EmptyState from '../components/shared/EmptyState';
import useAsyncData from '../hooks/useAsyncData';
import useRecordEditor from '../hooks/useRecordEditor';
import * as api from '../lib/api';
import { summariseNetWorth } from '../lib/networth';

/*
  /net-worth: everything owned minus everything owed.

  Debts are shown here but edited on the Debts page, so there is only one place
  to change them.
*/

const TITLE = 'Net worth';

async function loadNetWorthPage() {
  const [assets, debts] = await Promise.all([api.getAssets(), api.getDebts()]);

  if (assets.ok === false) {
    return assets;
  }
  if (debts.ok === false) {
    return debts;
  }

  return { ok: true, data: { assets: assets.data.assets, debts: debts.data.debts } };
}

export default function NetWorthPage({ user }) {
  const page = useAsyncData(loadNetWorthPage);

  const editor = useRecordEditor({
    add: api.addAsset,
    update: api.updateAsset,
    remove: api.deleteAsset,
    onChanged: page.reload,
  });

  if (page.error) {
    return <PageError user={user} title={TITLE} message={page.error} />;
  }

  if (page.data === null) {
    return <PageLoading user={user} title={TITLE} label="Loading what you own and owe" stats={3} cards={2} />;
  }

  const assets = page.data.assets;
  const summary = summariseNetWorth(assets, page.data.debts);

  const addButton = (
    <Button onClick={editor.startAdding} variant="accent">
      Add something
    </Button>
  );

  let headerAction = null;
  if (editor.isOpen === false) {
    headerAction = addButton;
  }

  let emptyAction = null;
  if (editor.isOpen === false) {
    emptyAction = addButton;
  }

  return (
    <AppShell user={user} title={TITLE} subtitle="Everything you own, minus everything you owe." action={headerAction}>
      <NetWorthHeadline summary={summary} />

      {editor.isOpen === true ? (
        <div className="mt-8">
          <AssetForm key={editor.formKey} asset={editor.record} onSave={editor.save} onCancel={editor.close} />
        </div>
      ) : null}

      <div className="mt-8">
        <h2 className="font-display text-[26px] leading-tight tracking-[-0.01em]">What you own</h2>

        <div className="mt-5">
          {assets.length === 0 ? (
            <EmptyState title="Nothing listed yet." action={emptyAction}>
              Start with your savings account. Add funds, EPF and gold as you go. It does not have to be exact
              to be useful.
            </EmptyState>
          ) : (
            <AssetList
              assets={assets}
              summary={summary}
              onEdit={editor.startEditing}
              onDelete={editor.remove}
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}
