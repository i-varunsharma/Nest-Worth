/*
  The categories a bank transaction can fall into.

  This lives in shared/ because both sides need exactly the same list. The
  server decides which category a line belongs to and refuses to store one that
  is not on this list; the browser draws a dropdown of them so a wrong guess can
  be corrected. Two copies of a list like this stay in step for about a week.

  The order below is the order they appear on screen. It runs roughly from
  "must be paid" down to "chose to", which is also the order somebody looking
  for something to cut would read them in.
*/

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

/*
  Money that arrives, and money that only moves.

  These are kept apart from the list above because neither is spending, and
  adding them into a spending total is the mistake that makes a breakdown
  useless. "investment" is the interesting one: a SIP leaving your account is
  not money spent, it is money moved into something you still own, so counting
  it as an expense would tell you to stop doing the one thing the app spends
  the rest of its time recommending.
*/
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
