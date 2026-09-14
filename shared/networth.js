// Net worth: what is owned minus what is owed. Negative early in a career is
// normal, and the page says so.


// Asset kinds, most liquid first. Liquid means it can become cash quickly without
// losing value, which is what counts towards an emergency fund.
export const ASSET_KINDS = [
  { value: 'cash', label: 'Cash and savings', liquid: true },
  { value: 'fd', label: 'Fixed deposit', liquid: true },
  { value: 'mutual_fund', label: 'Mutual funds', liquid: false },
  { value: 'stocks', label: 'Stocks', liquid: false },
  { value: 'epf', label: 'EPF or PPF', liquid: false },
  { value: 'gold', label: 'Gold', liquid: false },
  { value: 'property', label: 'Property', liquid: false },
  { value: 'other', label: 'Something else', liquid: false },
];


/* The kinds of debt, with a typical rate to help somebody filling the form. */
export const DEBT_KINDS = [
  { value: 'education', label: 'Education loan', typicalRate: 11 },
  { value: 'personal', label: 'Personal loan', typicalRate: 14 },
  { value: 'credit_card', label: 'Credit card', typicalRate: 42 },
  { value: 'vehicle', label: 'Vehicle loan', typicalRate: 9.5 },
  { value: 'home', label: 'Home loan', typicalRate: 8.5 },
  { value: 'other', label: 'Something else', typicalRate: 12 },
];


/* Finds the label for a stored value, so pages do not each write their own lookup. */
export function labelForKind(list, value) {
  const match = list.find((item) => item.value === value);

  if (match) {
    return match.label;
  }

  return 'Something else';
}


// Totals for assets and debts. liquidAssets is the part reachable in an emergency.
export function summariseNetWorth(assets, debts) {
  let totalAssets = 0;
  let liquidAssets = 0;

  assets.forEach((asset) => {
    totalAssets = totalAssets + asset.value;

    const kind = ASSET_KINDS.find((item) => item.value === asset.kind);

    if (kind && kind.liquid === true) {
      liquidAssets = liquidAssets + asset.value;
    }
  });

  let totalDebts = 0;

  debts.forEach((debt) => {
    totalDebts = totalDebts + debt.principal;
  });

  return {
    totalAssets: totalAssets,
    liquidAssets: liquidAssets,
    totalDebts: totalDebts,
    netWorth: totalAssets - totalDebts,
  };
}


// Assets grouped and totalled by kind for the breakdown bar. Empty groups are left out.
export function groupAssetsByKind(assets) {
  const groups = [];

  ASSET_KINDS.forEach((kind) => {
    let total = 0;

    assets.forEach((asset) => {
      if (asset.kind === kind.value) {
        total = total + asset.value;
      }
    });

    if (total > 0) {
      groups.push({ kind: kind.value, label: kind.label, total: total });
    }
  });

  return groups;
}
