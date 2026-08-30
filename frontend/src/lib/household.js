/*
  household.js
  ------------
  Small helpers to do with the household.

  This file used to save the answers into the browser's own storage. It no
  longer does, because there is a real server now and the answers live in the
  database next to the account. That is a better home for them: they survive a
  new laptop, a cleared browser, and a different phone.

  Reading and writing now happens through lib/api.js. What is left here are the
  two pieces that are not the server's business.
*/


// Used while the real answers are still being fetched, and as a starting point
// in onboarding: a fairly typical first job.
export const DEFAULT_HOUSEHOLD = {
  income: 62000,
  dependents: 2,
  hasLoan: true,
};


/*
  "Good morning" before noon, "Good afternoon" until five, "Good evening" after.

  This deliberately uses the clock on the reader's own computer rather than
  asking the server. The server is in one timezone, the reader could be in any,
  and greeting somebody with "good evening" over breakfast is a small thing that
  makes software feel like it was not written for them.
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
