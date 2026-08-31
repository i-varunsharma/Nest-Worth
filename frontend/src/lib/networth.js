/*
  Net worth is one subtraction:

      what you own  minus  what you owe

  Everything below is bookkeeping around that one line.

  Worth saying plainly: a negative net worth early in a career is normal, not a
  failure. Somebody with an education loan and a first job usually owes more
  than they own, and the number climbing towards zero is real progress. The
  interface says so, because a big red minus sign with no explanation makes
  people close the app.
*/


/*
  The kinds of thing people own, in the order we like to show them: the most
  liquid first, since that is the money available in an emergency.

  "liquid" means it can be turned into cash quickly without losing much value.
  A savings account is liquid. A flat is not.
*/
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


/*
  Adds everything up.

    assets  a list of { value, kind }
    debts   a list of { principal }

  "liquid" is the part that could be reached in a hurry, which is what the
  emergency fund calculation needs. Selling a flat to cover a bad month is not
  a plan.
*/
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


/*
  Groups assets by kind and adds up each group, for the breakdown bar.
  Groups with nothing in them are left out, so the bar has no invisible slivers.
*/
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
