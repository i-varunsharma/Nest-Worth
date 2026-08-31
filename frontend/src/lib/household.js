/*
  Small helpers to do with the household.

  Reading and saving happens through lib/api.js, since the answers live in the
  database next to the account. What is left here are the two pieces that are
  not the server's business.
*/


// Used while the real answers are still being fetched, and as a starting point
// in onboarding: a fairly typical first job.
export const DEFAULT_HOUSEHOLD = {
  income: 62000,
  dependents: 2,
  hasLoan: true,
  incomeVaries: false,

  // Rent, food, transport and bills. Roughly a third of the income above,
  // which is a common shape for a first flat in a mid-sized Indian city.
  essentialCosts: 22000,
};


/*
  "Good morning" before noon, "Good afternoon" until five, "Good evening" after.

  Uses the clock on the reader's own computer, not the server's. The server is
  in one timezone and the reader could be in any, and "good evening" at
  breakfast reads as software written for somebody else.
*/
export function greetingForNow() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return 'Good morning';
  }

  if (hour < 17) {
    return 'Good afternoon';
  }

  return 'Good evening';
}
