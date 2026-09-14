import { ASSET_KINDS, DEBT_KINDS } from '../../../shared/networth.js';

/*
  Checks for debts, goals, assets, check-ins, and the month and year values used
  in addresses. Each check returns an error message or an empty string. Each
  ...Values function turns a body that passed its check into the values to store.

  Family members are checked in shared/family.js, because the form uses the same check.
*/

const MAX_NAME_LENGTH = 60;
const MAX_AMOUNT = 1000000000;
const MAX_NOTE_LENGTH = 300;
const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

export const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
export const YEAR_PATTERN = /^\d{4}$/;


function kindValues(kinds) {
  return kinds.map((kind) => {
    return kind.value;
  });
}

const DEBT_KIND_VALUES = kindValues(DEBT_KINDS);
const ASSET_KIND_VALUES = kindValues(ASSET_KINDS);


function checkRecordName(name, emptyMessage) {
  if (typeof name !== 'string' || name.trim().length === 0) {
    return emptyMessage;
  }
  if (name.trim().length > MAX_NAME_LENGTH) {
    return 'That name is too long.';
  }
  return '';
}

function isAmount(value, allowZero) {
  const number = Number(value);

  if (!Number.isFinite(number) || number > MAX_AMOUNT) {
    return false;
  }
  if (allowZero === true) {
    return number >= 0;
  }
  return number > 0;
}


// ---------------------------------------------------------------
// Debts
// ---------------------------------------------------------------

export function checkDebt(body) {
  const nameError = checkRecordName(body.name, 'Give this debt a name.');
  if (nameError) {
    return nameError;
  }
  if (!DEBT_KIND_VALUES.includes(body.kind)) {
    return 'Pick what kind of debt this is.';
  }
  if (!isAmount(body.principal, false)) {
    return 'That outstanding amount does not look right.';
  }

  const annualRate = Number(body.annualRate);
  if (!Number.isFinite(annualRate) || annualRate < 0 || annualRate > 100) {
    return 'The interest rate should be between 0 and 100.';
  }
  if (!isAmount(body.emi, false)) {
    return 'That EMI does not look right.';
  }

  // An EMI at or below the monthly interest never clears the loan. On a card
  // that is real, but when entering a loan it is almost always a typo.
  const monthlyInterest = Number(body.principal) * (annualRate / 100 / 12);

  if (Number(body.emi) <= monthlyInterest) {
    const needed = Math.ceil(monthlyInterest);
    return 'An EMI of that size never clears this debt. Interest alone is about ₹' + needed + ' a month.';
  }

  return '';
}

export function debtValues(body) {
  return {
    name: body.name.trim(),
    kind: body.kind,
    principal: Number(body.principal),
    annualRate: Number(body.annualRate),
    emi: Number(body.emi),
  };
}


// ---------------------------------------------------------------
// Goals
// ---------------------------------------------------------------

// A date in the past is allowed: the page marks the goal overdue rather than hiding it.
export function checkGoal(body) {
  const nameError = checkRecordName(body.name, 'Give this goal a name.');
  if (nameError) {
    return nameError;
  }
  if (!isAmount(body.targetAmount, false)) {
    return 'That target amount does not look right.';
  }
  if (!isAmount(body.savedAmount, true)) {
    return 'That saved amount does not look right.';
  }
  if (Number(body.savedAmount) > Number(body.targetAmount)) {
    return 'You have saved more than the target. Raise the target, or mark it done.';
  }
  if (typeof body.targetDate !== 'string' || Number.isNaN(Date.parse(body.targetDate))) {
    return 'Pick a target date.';
  }
  return '';
}

export function goalValues(body) {
  return {
    name: body.name.trim(),
    targetAmount: Number(body.targetAmount),
    savedAmount: Number(body.savedAmount),
    targetDate: body.targetDate,
  };
}


// ---------------------------------------------------------------
// Assets
// ---------------------------------------------------------------

export function checkAsset(body) {
  const nameError = checkRecordName(body.name, 'Give this a name.');
  if (nameError) {
    return nameError;
  }
  if (!ASSET_KIND_VALUES.includes(body.kind)) {
    return 'Pick what kind of asset this is.';
  }
  // Zero is allowed, for an account opened but not funded yet.
  if (!isAmount(body.value, true)) {
    return 'That value does not look right.';
  }
  return '';
}

export function assetValues(body) {
  return {
    name: body.name.trim(),
    kind: body.kind,
    value: Number(body.value),
  };
}


// ---------------------------------------------------------------
// Family members (the rule itself lives in shared/family.js)
// ---------------------------------------------------------------

export function familyMemberValues(body) {
  return {
    name: body.name.trim(),
    relation: body.relation,
    monthlySupport: Math.round(Number(body.monthlySupport)),
    hasHealthCover: body.hasHealthCover === true,
  };
}


// ---------------------------------------------------------------
// Check-ins
// ---------------------------------------------------------------

const CHECKIN_AMOUNTS = ['income', 'spent', 'saved', 'invested'];

export function checkCheckin(body) {
  if (typeof body.month !== 'string' || MONTH_PATTERN.test(body.month) === false) {
    return 'That month is not in the right form.';
  }

  const year = Number(body.month.slice(0, 4));
  if (year < MIN_YEAR || year > MAX_YEAR) {
    return 'That year does not look right.';
  }

  for (const field of CHECKIN_AMOUNTS) {
    if (!isAmount(body[field], true)) {
      return 'The ' + field + ' figure does not look right.';
    }
  }

  if (typeof body.note === 'string' && body.note.length > MAX_NOTE_LENGTH) {
    return 'That note is too long.';
  }

  return '';
}

export function checkinValues(body) {
  let note = '';
  if (typeof body.note === 'string') {
    note = body.note.trim();
  }

  return {
    month: body.month,
    income: Number(body.income),
    spent: Number(body.spent),
    saved: Number(body.saved),
    invested: Number(body.invested),
    note: note,
  };
}


// ---------------------------------------------------------------
// Months and years in addresses
// ---------------------------------------------------------------

/* The month from a query string, the current month when missing, or '' when invalid. */
export function readMonth(value) {
  if (value === undefined || value === null || value === '') {
    return new Date().toISOString().slice(0, 7);
  }
  if (MONTH_PATTERN.test(String(value)) === false) {
    return '';
  }
  return String(value);
}

/* The year from a query string, the current year when missing, or '' when invalid. */
export function readYear(value) {
  if (value === undefined || value === null || value === '') {
    return String(new Date().getFullYear());
  }
  if (YEAR_PATTERN.test(String(value)) === false) {
    return '';
  }
  return String(value);
}
