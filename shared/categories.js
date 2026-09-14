// Transaction categories, shared so the server and the browser use the same list.
// Ordered from must-pay to chosen, the order somebody looking for savings reads them.

export const SPENDING_CATEGORIES = [
  { key: 'rent', label: 'Rent' },
  { key: 'bills', label: 'Bills and utilities' },
  { key: 'emi', label: 'Loan repayments' },
  { key: 'groceries', label: 'Groceries' },
  { key: 'food', label: 'Eating out and delivery' },
  { key: 'transport', label: 'Transport and fuel' },
  { key: 'health', label: 'Health' },
  { key: 'education', label: 'Education' },
  { key: 'shopping', label: 'Shopping' },
  { key: 'entertainment', label: 'Entertainment' },
  { key: 'fees', label: 'Bank charges' },
  { key: 'other', label: 'Everything else' },
];

// Money that arrives or only moves. Never counted as spending: a SIP is money moved
// into something still owned, not money spent.
export const NON_SPENDING_CATEGORIES = [
  { key: 'income', label: 'Income' },
  { key: 'investment', label: 'Investing and saving' },
  { key: 'transfer', label: 'Transfers between your own accounts' },
];

export const ALL_CATEGORIES = SPENDING_CATEGORIES.concat(NON_SPENDING_CATEGORIES);


/* Is this key one we know about? Used to refuse anything else on the way in. */
export function isKnownCategory(key) {
  for (const category of ALL_CATEGORIES) {
    if (category.key === key) {
      return true;
    }
  }

  return false;
}


/* Does this category count towards what was spent this month? */
export function isSpending(key) {
  for (const category of SPENDING_CATEGORIES) {
    if (category.key === key) {
      return true;
    }
  }

  return false;
}


/* The name to print. Falls back to the key so an unknown one is visible
   rather than blank. */
export function categoryLabel(key) {
  for (const category of ALL_CATEGORIES) {
    if (category.key === key) {
      return category.label;
    }
  }

  return key;
}
