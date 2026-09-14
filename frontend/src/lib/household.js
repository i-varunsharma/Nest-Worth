// Household helpers that do not involve the server.


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


// "Good morning", "Good afternoon" or "Good evening" by the reader's own clock.
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
