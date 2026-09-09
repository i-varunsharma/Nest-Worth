import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../components/app/AppShell';
import { SkeletonPage } from '../components/shared/Skeleton';
import AssetForm from '../components/app/AssetForm';
import Button from '../components/shared/Button';
import * as api from '../lib/api';
import {
  ASSET_KINDS,
  groupAssetsByKind,
  labelForKind,
  summariseNetWorth,
} from '../lib/networth';
import { formatRupees } from '../lib/plan';

/*
  The screen at /net-worth. One subtraction, shown properly:

      what you own  minus  what you owe

  The debts are read here but not edited here. They belong to the Debts page,
  and having two places to change the same thing is how data ends up
  contradicting itself.

  A word on the tone of this page. A negative net worth early in a career is
  normal, not a failure. Somebody with an education loan and a first job usually
  owes more than they own, and the number climbing towards zero is real progress.
  The page says that out loud, because a large red minus with no explanation
  makes people close the app rather than come back.

  Props:
    user - the signed-in person, handed down by RequireAuth
*/

// The colour of each slice in the breakdown bar. Assets only: debts get clay.
const KIND_COLOURS = {
  cash: 'bg-accent',
  fd: 'bg-accent/70',
  mutual_fund: 'bg-brass',
  stocks: 'bg-brass/70',
  epf: 'bg-ink/40',
  gold: 'bg-brass/50',
  property: 'bg-ink/25',
  other: 'bg-line',
};

export default function NetWorthPage({ user }) {
  const [assets, setAssets] = useState(null);
  const [debts, setDebts] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState(null);

  const reload = async () => {
    // Both lists at once, since neither depends on the other.
    const [assetResult, debtResult] = await Promise.all([api.getAssets(), api.getDebts()]);

    if (!assetResult.ok) {
      setLoadError(assetResult.error);
      return;
    }

    setAssets(assetResult.data.assets);

    if (debtResult.ok) {
      setDebts(debtResult.data.debts);
    }
  };

  /*
    The first load. The stillMounted flag guards against the answer arriving
    after the page has been left.
  */
  useEffect(() => {
    let stillMounted = true;

    Promise.all([api.getAssets(), api.getDebts()]).then(([assetResult, debtResult]) => {
      if (!stillMounted) {
        return;
      }

      if (!assetResult.ok) {
        setLoadError(assetResult.error);
        return;
      }

      setAssets(assetResult.data.assets);

      if (debtResult.ok) {
        setDebts(debtResult.data.debts);
      }
    });

    return () => {
      stillMounted = false;
    };
  }, []);

  const handleAdd = async (values) => {
    const result = await api.addAsset(values);
    if (result.ok) {
      setEditing(null);
      await reload();
    }
    return result;
  };

  const handleUpdate = async (values) => {
    const result = await api.updateAsset(editing.id, values);
    if (result.ok) {
      setEditing(null);
      await reload();
    }
    return result;
  };

  const handleDelete = async (id) => {
    await api.deleteAsset(id);
    await reload();
  };

  if (loadError) {
    return (
      <AppShell user={user} title="Net worth">
        <p className="text-[14.5px] text-clay">{loadError}</p>
      </AppShell>
    );
  }

  if (assets === null) {
    return (
      <AppShell user={user} title="Net worth">
        <SkeletonPage label="Loading what you own and owe" stats={3} cards={2} />
      </AppShell>
    );
  }

  const summary = summariseNetWorth(assets, debts);
  const groups = groupAssetsByKind(assets);

  const isNegative = summary.netWorth < 0;

  // The bar under the headline compares owned against owed. Both are drawn as
  // a share of whichever is bigger, so the larger one always fills the width.
  let biggest = summary.totalAssets;
  if (summary.totalDebts > biggest) {
    biggest = summary.totalDebts;
  }
  if (biggest === 0) {
    biggest = 1;
  }

  /*
    Which thing the form is editing, worked out before the JSX.

    The "key" matters more than it looks. React reuses a component that stays in
    the same place, and a form's useState only reads its starting values once,
    when it first appears. So pressing Edit on one row and then Edit on another
    would leave the previous row's values in the boxes while saving them against
    the new row's id, quietly overwriting the wrong record.

    Giving the form a key that changes with the target tells React it is a
    different form, so it is thrown away and rebuilt with the right values.
  */
  let formKey = 'new';
  let assetBeingEdited = null;

  if (editing !== null && editing !== 'new') {
    formKey = 'asset-' + editing.id;
    assetBeingEdited = editing;
  }

  const addButton = (
    <Button onClick={() => setEditing('new')} variant="accent">
      Add something
    </Button>
  );

  return (
    <AppShell
      user={user}
      title="Net worth"
      subtitle="Everything you own, minus everything you owe."
      action={editing === null ? addButton : null}
    >

      {/* ---------- The headline number ---------- */}
      <div className="rounded-[26px] border border-line bg-surface p-6 shadow-card sm:p-8">
        <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">
          Where you stand today
        </p>

        <p
          className={
            'tnum mt-4 font-display text-[clamp(2.6rem,6vw,3.6rem)] leading-none '
            + (isNegative ? 'text-clay' : 'text-accent')
          }
        >
          {formatRupees(summary.netWorth)}
        </p>

        {isNegative === true ? (
          <p className="mt-4 max-w-lg text-[14.5px] leading-relaxed text-ink2">
            Below zero, which is completely normal this early. An education loan arrives
            years before the savings do. What matters is the direction, and every EMI moves
            this number up.
          </p>
        ) : (
          <p className="mt-4 max-w-lg text-[14.5px] leading-relaxed text-ink2">
            Above water. Everything you own is worth more than everything you owe.
          </p>
        )}

        {/* Owned against owed. */}
        <div className="mt-8 space-y-4">
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-[13.5px] font-medium text-ink2">You own</span>
              <span className="tnum text-[15px] font-semibold text-ink">
                {formatRupees(summary.totalAssets)}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-paperDeep">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-700 ease-smooth"
                style={{ width: (summary.totalAssets / biggest) * 100 + '%' }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-[13.5px] font-medium text-ink2">You owe</span>
              <span className="tnum text-[15px] font-semibold text-ink">
                {formatRupees(summary.totalDebts)}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-paperDeep">
              <div
                className="h-full rounded-full bg-clay transition-[width] duration-700 ease-smooth"
                style={{ width: (summary.totalDebts / biggest) * 100 + '%' }}
              />
            </div>
            <p className="mt-2 text-2xs text-muted">
              From your{' '}
              <Link to="/debts" className="sweep font-medium text-ink">
                debts
              </Link>
              . Edit them there.
            </p>
          </div>
        </div>
      </div>

      {/* ---------- The form ---------- */}
      {editing !== null ? (
        <div className="mt-8">
          <AssetForm
            key={formKey}
            asset={assetBeingEdited}
            onSave={editing === 'new' ? handleAdd : handleUpdate}
            onCancel={() => setEditing(null)}
          />
        </div>
      ) : null}

      {/* ---------- What you own ---------- */}
      <div className="mt-8">
        <h2 className="font-display text-[26px] leading-tight tracking-[-0.01em]">
          What you own
        </h2>

        {assets.length === 0 ? (
          <div className="mt-5 rounded-[22px] border border-dashed border-line bg-surface/50 p-10 text-center">
            <p className="font-display text-[22px] leading-snug">Nothing listed yet.</p>
            <p className="mx-auto mt-3 max-w-sm text-[14.5px] leading-relaxed text-ink2">
              Start with your savings account. Add funds, EPF and gold as you go. It does not
              have to be exact to be useful.
            </p>
            {editing === null ? <div className="mt-7 flex justify-center">{addButton}</div> : null}
          </div>
        ) : (
          <>
            {/* The breakdown bar. One slice per kind of asset. */}
            <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-paperDeep">
              {groups.map((group) => {
                return (
                  <div
                    key={group.kind}
                    className={'h-full ' + KIND_COLOURS[group.kind]}
                    style={{ width: (group.total / summary.totalAssets) * 100 + '%' }}
                    title={group.label}
                  />
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
              {groups.map((group) => {
                return (
                  <span key={group.kind} className="flex items-center gap-2 text-2xs text-muted">
                    <span className={'h-2 w-2 rounded-full ' + KIND_COLOURS[group.kind]} />
                    {group.label} {formatRupees(group.total, { short: true })}
                  </span>
                );
              })}
            </div>

            {/* One row per asset. */}
            <div className="mt-6 overflow-hidden rounded-[22px] border border-line bg-surface shadow-card">
              {assets.map((asset) => {
                return (
                  <div
                    key={asset.id}
                    className="flex flex-wrap items-center justify-between gap-4 border-b border-lineSoft px-6 py-5 last:border-0"
                  >
                    <div>
                      <p className="text-[15px] font-semibold text-ink">{asset.name}</p>
                      <p className="mt-1 text-2xs text-muted">
                        {labelForKind(ASSET_KINDS, asset.kind)}
                      </p>
                    </div>

                    <div className="flex items-center gap-5">
                      <span className="tnum text-[16px] font-semibold text-ink">
                        {formatRupees(asset.value)}
                      </span>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setEditing(asset)}
                          className="sweep text-[13px] font-medium text-muted transition-colors hover:text-ink"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(asset.id)}
                          className="sweep text-[13px] font-medium text-muted transition-colors hover:text-clay"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="mt-4 text-2xs leading-relaxed text-muted">
              {formatRupees(summary.liquidAssets)} of this could be reached quickly. The rest is
              in things that take time to sell, which is fine, but it is not the money for a bad
              month.
            </p>
          </>
        )}
      </div>
    </AppShell>
  );
}
