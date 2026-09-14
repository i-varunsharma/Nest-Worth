import RecordActions from '../shared/RecordActions';
import { ASSET_KINDS, groupAssetsByKind, labelForKind } from '../../lib/networth';
import { formatRupees } from '../../lib/plan';

/* The breakdown bar by kind of asset, then one row per asset. */

// Theme colours for each kind of asset in the breakdown bar.
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

export default function AssetList({ assets, summary, onEdit, onDelete }) {
  const groups = groupAssetsByKind(assets);

  return (
    <>
      <div className="flex h-3 overflow-hidden rounded-full bg-paperDeep">
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

      <div className="mt-6 overflow-hidden rounded-[22px] border border-line bg-surface shadow-card">
        {assets.map((asset) => {
          return (
            <div
              key={asset.id}
              className="flex flex-wrap items-center justify-between gap-4 border-b border-lineSoft px-6 py-5 last:border-0"
            >
              <div>
                <p className="text-[15px] font-semibold text-ink">{asset.name}</p>
                <p className="mt-1 text-2xs text-muted">{labelForKind(ASSET_KINDS, asset.kind)}</p>
              </div>

              <div className="flex items-center gap-5">
                <span className="tnum text-[16px] font-semibold text-ink">{formatRupees(asset.value)}</span>
                <RecordActions onEdit={() => onEdit(asset)} onDelete={() => onDelete(asset.id)} />
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-2xs leading-relaxed text-muted">
        {formatRupees(summary.liquidAssets)} of this could be reached quickly. The rest is in things that take
        time to sell, which is fine, but it is not the money for a bad month.
      </p>
    </>
  );
}
