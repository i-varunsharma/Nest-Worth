import crypto from 'node:crypto';
import { categorise } from './categorise.js';

/*
  Turning a bank statement CSV into rows this app can store.

  Every bank exports a different shape. Some have one Amount column with a
  separate Dr/Cr marker, some have Withdrawal and Deposit as two columns, and
  the date might be 05/01/2026 or 05-Jan-26 or 2026-01-05. The header row is
  rarely the first line, because banks like to print the account number and a
  date range above it.

  So this file does not assume a layout. It hunts for the header row, works out
  which column is which from the words in it, and reads the rest against that.

  Nothing here touches the database. It takes text and returns values, which is
  why it can be tested without a server, and why the route file next door stays
  short.
*/

// Anything past this and something has gone wrong, or somebody is trying to
// make the server do a lot of work with one request.
const MAX_ROWS = 5000;

/*
  The column names, in every spelling that has turned up. Compared after being
  lower-cased and stripped of anything that is not a letter or a number, so
  "Withdrawal Amt." and "withdrawal amt" are the same thing here.
*/
const COLUMN_ALIASES = {
  date: ['date', 'txndate', 'transactiondate', 'valuedate', 'trandate', 'postingdate', 'dateofTransaction'],
  description: ['narration', 'description', 'particulars', 'details', 'remarks', 'transactionremarks', 'narrationdescription'],
  debit: ['withdrawalamt', 'withdrawal', 'debit', 'debitamount', 'withdrawals', 'dr'],
  credit: ['depositamt', 'deposit', 'credit', 'creditamount', 'deposits', 'cr'],
  amount: ['amount', 'transactionamount', 'txnamount'],
  type: ['type', 'drcr', 'crdr', 'transactiontype', 'debitcredit'],
};

const MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];


/*
  Splits one CSV line into its fields.

  A plain line.split(',') is wrong the moment a description contains a comma,
  which bank narrations do constantly. The rule in CSV is that a field wrapped
  in double quotes may contain commas, and a doubled "" inside such a field
  means one literal quote character.

  So this walks the line one character at a time, keeping track of whether it is
  currently inside quotes, and only treats a comma as a separator when it is not.
*/
export function splitCsvLine(line) {
  const fields = [];
  let current = '';
  let insideQuotes = false;
  let position = 0;

  while (position < line.length) {
    const character = line[position];

    if (insideQuotes === true) {
      if (character === '"') {
        // Two quotes in a row is an escaped quote, not the end of the field.
        if (line[position + 1] === '"') {
          current = current + '"';
          position = position + 2;
          continue;
        }

        insideQuotes = false;
        position = position + 1;
        continue;
      }

      current = current + character;
      position = position + 1;
      continue;
    }

    if (character === '"') {
      insideQuotes = true;
      position = position + 1;
      continue;
    }

    if (character === ',') {
      fields.push(current.trim());
      current = '';
      position = position + 1;
      continue;
    }

    current = current + character;
    position = position + 1;
  }

  fields.push(current.trim());

  return fields;
}


/* Lower case, letters and digits only. Used to compare header names. */
function normaliseHeading(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]/g, '');
}


/*
  Reads a date in any of the shapes an Indian bank exports, and returns it as
  'YYYY-MM-DD'. Returns an empty string if it is not a date at all.

  One decision worth knowing about: 05/01/2026 is read as the fifth of January,
  not the first of May. Day first is the Indian convention and this app is for
  Indian households, but there is no way to tell the two apart from the text
  alone, so it is a choice rather than a deduction. It is written down here
  because a silently wrong month would push transactions into the wrong
  check-in and nothing on screen would look odd.
*/
export function parseDate(text) {
  const value = String(text).trim();

  if (value.length === 0) {
    return '';
  }

  // Already the way we store it: 2026-01-05
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (isoMatch) {
    return isoMatch[1] + '-' + isoMatch[2] + '-' + isoMatch[3];
  }

  // 05-Jan-26 or 05 Jan 2026
  const namedMonth = value.match(/^(\d{1,2})[-/ ]([A-Za-z]{3,})[-/ ](\d{2,4})$/);

  if (namedMonth) {
    const monthIndex = MONTH_NAMES.indexOf(namedMonth[2].toLowerCase().slice(0, 3));

    if (monthIndex === -1) {
      return '';
    }

    return buildDate(namedMonth[3], monthIndex + 1, namedMonth[1]);
  }

  // 05/01/2026 or 05-01-26
  const numeric = value.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);

  if (numeric) {
    return buildDate(numeric[3], numeric[2], numeric[1]);
  }

  return '';
}


/* Pads the parts out and checks the result is a real date. */
function buildDate(yearText, monthNumber, dayNumber) {
  let year = Number(yearText);

  // A two digit year. Every statement anybody imports is from this century.
  if (year < 100) {
    year = 2000 + year;
  }

  const month = Number(monthNumber);
  const day = Number(dayNumber);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return '';
  }

  const monthText = String(month).padStart(2, '0');
  const dayText = String(day).padStart(2, '0');

  return year + '-' + monthText + '-' + dayText;
}


/*
  Reads an amount. Handles the rupee sign, thousands separators, brackets for a
  negative, and a trailing Dr or Cr. Returns 0 for an empty cell, because an
  empty Withdrawal column means "nothing came out", not "unreadable".
*/
export function parseAmount(text) {
  let value = String(text).trim();

  if (value.length === 0 || value === '-') {
    return 0;
  }

  // Accountants write a negative in brackets.
  let isNegative = false;

  if (value.startsWith('(') && value.endsWith(')')) {
    isNegative = true;
    value = value.slice(1, -1);
  }

  // Strip everything that is not a digit, a dot or a minus sign.
  value = value.replace(/[^0-9.-]/g, '');

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return null;
  }

  if (isNegative === true) {
    return -amount;
  }

  return amount;
}


/*
  Finds the header row and works out which column holds what.

  It walks down the file looking for the first line that names both a date and
  something to read money out of. Everything above that line is the bank's own
  preamble, and everything below it is transactions.
*/
export function findColumns(lines) {
  for (let index = 0; index < lines.length; index = index + 1) {
    const cells = splitCsvLine(lines[index]).map(normaliseHeading);

    const columns = {
      date: -1,
      description: -1,
      debit: -1,
      credit: -1,
      amount: -1,
      type: -1,
    };

    for (const field of Object.keys(COLUMN_ALIASES)) {
      const aliases = COLUMN_ALIASES[field].map(normaliseHeading);

      for (let cell = 0; cell < cells.length; cell = cell + 1) {
        if (columns[field] === -1 && aliases.includes(cells[cell])) {
          columns[field] = cell;
        }
      }
    }

    const hasMoney = columns.debit !== -1 || columns.credit !== -1 || columns.amount !== -1;

    if (columns.date !== -1 && hasMoney) {
      return { headerRow: index, columns: columns };
    }
  }

  return null;
}


/*
  The whole job: text in, rows out.

  Returns { rows, skipped, error }. An error means nothing could be read at all
  and is a message to show the person. skipped counts lines that looked like
  transactions but were not usable, which is normal at the bottom of a statement
  where banks print totals and disclaimers.
*/
export function parseStatement(csvText) {
  const lines = String(csvText)
    .split(/\r?\n/)
    .filter((line) => {
      return line.trim().length > 0;
    });

  if (lines.length === 0) {
    return { rows: [], skipped: 0, error: 'That file is empty.' };
  }

  const found = findColumns(lines);

  if (found === null) {
    return {
      rows: [],
      skipped: 0,
      error: 'Could not find the column headings. The file needs a row naming a '
        + 'date column and either an amount column or withdrawal and deposit columns.',
    };
  }

  const columns = found.columns;
  const rows = [];
  let skipped = 0;

  /*
    How many times each identical transaction has been seen so far.

    Two ₹200 Swiggy orders on the same day are two real, separate payments, and
    they produce byte-for-byte identical lines. Counting them means the second
    one gets a different fingerprint from the first, so both are kept, while
    re-importing the same statement produces the same counts again and both are
    recognised as already there. It is what makes the import safe to run twice.
  */
  const seenCounts = new Map();

  for (let index = found.headerRow + 1; index < lines.length; index = index + 1) {
    if (rows.length >= MAX_ROWS) {
      break;
    }

    const cells = splitCsvLine(lines[index]);

    const occurredOn = parseDate(cells[columns.date]);

    if (occurredOn === '') {
      skipped = skipped + 1;
      continue;
    }

    let description = '';

    if (columns.description !== -1 && cells[columns.description]) {
      description = cells[columns.description].trim();
    }

    if (description.length === 0) {
      description = 'Unnamed transaction';
    }

    const money = readMoney(cells, columns);

    if (money === null) {
      skipped = skipped + 1;
      continue;
    }

    const key = occurredOn + '|' + description + '|' + money.amount + '|' + money.direction;

    let seen = seenCounts.get(key);

    if (seen === undefined) {
      seen = 0;
    }

    seen = seen + 1;
    seenCounts.set(key, seen);

    rows.push({
      occurredOn: occurredOn,
      description: description.slice(0, 200),
      amount: money.amount,
      direction: money.direction,
      category: categorise(description, money.direction),
      fingerprint: fingerprintFor(key, seen),
    });
  }

  if (rows.length === 0) {
    return {
      rows: [],
      skipped: skipped,
      error: 'Found the headings but no readable transactions underneath them.',
    };
  }

  return { rows: rows, skipped: skipped, error: '' };
}


/*
  Pulls the amount and the direction out of one row, whichever layout the bank
  used. Returns null when there is no money on the line, which is what a totals
  row at the bottom of the file looks like.
*/
function readMoney(cells, columns) {
  // Two columns: whichever one has a figure in it decides the direction.
  if (columns.debit !== -1 || columns.credit !== -1) {
    let debit = 0;
    let credit = 0;

    if (columns.debit !== -1) {
      debit = parseAmount(cells[columns.debit]);
    }

    if (columns.credit !== -1) {
      credit = parseAmount(cells[columns.credit]);
    }

    if (debit === null || credit === null) {
      return null;
    }

    if (debit > 0) {
      return { amount: debit, direction: 'debit' };
    }

    if (credit > 0) {
      return { amount: credit, direction: 'credit' };
    }

    return null;
  }

  // One column. The direction comes from a Dr/Cr marker if there is one, and
  // from the sign of the number if there is not.
  const amount = parseAmount(cells[columns.amount]);

  if (amount === null || amount === 0) {
    return null;
  }

  if (columns.type !== -1 && cells[columns.type]) {
    const marker = String(cells[columns.type]).trim().toUpperCase();

    if (marker.startsWith('C')) {
      return { amount: Math.abs(amount), direction: 'credit' };
    }

    if (marker.startsWith('D') || marker.startsWith('W')) {
      return { amount: Math.abs(amount), direction: 'debit' };
    }
  }

  if (amount < 0) {
    return { amount: Math.abs(amount), direction: 'debit' };
  }

  return { amount: amount, direction: 'credit' };
}


/*
  A short, stable name for one transaction, used to recognise it on a second
  import. Hashing rather than storing the text keeps the column small and fixed
  in length, and gives the database one tidy thing to put a UNIQUE index on.
*/
function fingerprintFor(key, occurrence) {
  return crypto.createHash('sha256')
    .update(key + '|' + occurrence)
    .digest('hex')
    .slice(0, 32);
}


/*
  A readable name out of a bank narration.

  "UPI-SWIGGY-SWIGGY@YBL-YESB0000001-4839201-PAYMENT" becomes "SWIGGY". The
  payment rail at the front is dropped because every line has one and none of
  them names anybody, and the rest is cut at the first separator, which is where
  the handle and the reference number start on nearly every Indian bank line.

  It lives here rather than with the code that uses it, in lib/recap.js, for one
  practical reason: this file has no database import, so it can be tested by
  calling it, without a server or a temporary database file.
*/
export function merchantName(description) {
  let text = String(description).toUpperCase();

  // The rail this went over. Not a merchant.
  text = text.replace(/^(UPI|NEFT|IMPS|POS|ACH|ATM|MMT)[-\s/]+/, '');
  text = text.replace(/^(DR|CR)[-\s/]+/, '');

  // A card terminal number, which is what a POS line starts with. It is
  // followed by a space rather than a dash, which is what keeps this from
  // eating a narration that is nothing but a reference number.
  text = text.replace(/^\d+\s+/, '');

  const pieces = text.split(/[-@/]/);

  let name = pieces[0].trim();

  if (name.length === 0 && pieces.length > 1) {
    name = pieces[1].trim();
  }

  // A pure number is a reference, not a name, so the whole line is kept
  // instead. An entry reading "4839201" would be worse than an untidy one.
  if (/^\d+$/.test(name) === true) {
    return text.slice(0, 30).trim();
  }

  return name.slice(0, 30);
}
