/*
  household.js
  ------------
  Remembers the household between pages.

  The problem this solves: the onboarding screen asks the questions, and the
  dashboard shows the answers. Those are two different pages, and React state
  disappears the moment you move from one page to another. So the answers have
  to be written down somewhere that survives the move.

  We use localStorage, which is a small box of text the browser keeps for this
  website. It survives moving between pages and even closing the tab.

  Two things to know about localStorage, and both are worth saying in an
  interview:

    1. It only stores TEXT. Objects have to be turned into text with
       JSON.stringify on the way in, and back into an object with JSON.parse on
       the way out.

    2. It can throw an error. A private window, a browser with site data
       switched off, or a full disk will all make it fail. That is why every
       read and write below is wrapped in try / catch. A saved preference is
       never worth crashing the whole page over.

  When there is a real backend, this file is what gets replaced by proper API
  calls. Nothing else has to change, because every page talks to these three
  functions rather than to localStorage directly.
*/

// The key is just the label on the box. Prefixing it with the app name stops it
// clashing with anything else stored for the same website.
const STORAGE_KEY = 'nestworth.household';

// Used before anyone has answered anything: a fairly typical first job.
export const DEFAULT_HOUSEHOLD = {
  name: '',
  income: 62000,
  dependents: 2,
  hasLoan: true,
};


/*
  Reads the saved household back out.
  Returns the default one if nothing has been saved, or if anything goes wrong.
*/
export function loadHousehold() {
  try {
    const savedText = window.localStorage.getItem(STORAGE_KEY);

    // getItem gives back null when nothing was ever saved under this key.
    if (savedText === null) {
      return DEFAULT_HOUSEHOLD;
    }

    const saved = JSON.parse(savedText);

    // Never trust what comes out of storage. Someone could have edited it by
    // hand, or an older version of the app could have saved a different shape.
    // Building a fresh object here means the rest of the app always receives
    // exactly the four fields it expects.
    return {
      name: saved.name || '',
      income: Number(saved.income) || DEFAULT_HOUSEHOLD.income,
      dependents: Number(saved.dependents) || 0,
      hasLoan: saved.hasLoan === true,
    };
  } catch {
    // Storage was unavailable or the saved text was not valid JSON.
    // Either way, the defaults are a perfectly good answer.
    return DEFAULT_HOUSEHOLD;
  }
}


/*
  Saves the household. Returns true if it worked, so a caller can react if
  it did not, though nothing in this app needs to yet.
*/
export function saveHousehold(household) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(household));
    return true;
  } catch {
    // A private window or full disk. Not worth crashing the page over.
    return false;
  }
}


/*
  Forgets everything. This is what a "sign out" or "start again" button calls.
*/
export function clearHousehold() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}


/*
  "Good morning" before noon, "Good afternoon" until five, "Good evening" after.
  A small touch, but it makes the dashboard feel like it belongs to somebody.
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
