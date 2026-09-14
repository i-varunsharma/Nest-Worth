import crypto from 'node:crypto';
import { categorise } from './categorise.js';

/*
  Turns a bank statement CSV into rows to store.

  Banks disagree on layout: one Amount column with Dr/Cr or separate Withdrawal and
  Deposit columns, dates as 05/01/2026 or 05-Jan-26, and account details printed
  above the header. So nothing is assumed: the header row is found, its columns are
  identified by name, and the rest is read against that.

  No database access, so every function here can be tested directly.
*/

// Anything past this and something has gone wrong, or somebody is trying to
// make the server do a lot of work with one request.
const MAX_ROWS = 5000;

// Column names in every spelling seen, compared lower-cased with punctuation
// removed, so "Withdrawal Amt." matches "withdrawal amt".
const COLUMN_ALIASES = {
  date: ['date', 'txndate', 'transactiondate', 'valuedate', 'trandate', 'postingdate', 'dateofTransaction'],
  description: ['narration', 'description', 'particulars', 'details', 'remarks', 'transactionremarks', 'narrationdescription'],
  debit: ['withdrawalamt', 'withdrawal', 'debit', 'debitamount', 'withdrawals', 'dr'],
  credit: ['depositamt', 'deposit', 'credit', 'creditamount', 'deposits', 'cr'],
  amount: ['amount', 'transactionamount', 'txnamount'],
  type: ['type', 'drcr', 'crdr', 'transactiontype', 'debitcredit'],
};

const MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];


// Splits one CSV line into fields. A quoted field may contain commas, and "" inside
// quotes is a literal quote, so the line is read character by character.
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
  Reads a date in any shape an Indian bank exports and returns 'YYYY-MM-DD', or ''.

  05/01/2026 is read day first, as the fifth of January. The text cannot tell the
  two apart, so this is a decision, and tests/statement.test.js keeps it fixed.
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


// Reads an amount: rupee sign, commas, brackets for negative, trailing Dr or Cr.
// An empty cell is 0, meaning nothing moved in that column.
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


// Finds the header row: the first line naming a date column and a money column.
// Everything above it is the bank's preamble.
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


// Text in, rows out. Returns { rows, skipped, error }. error means nothing could be
// read; skipped counts unusable lines, such as totals at the bottom.
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
    How many identical lines have been seen so far. Two identical ₹200 orders on one
    day are two payments, so the count goes into the fingerprint: both are kept, and
    re-importing the file produces the same fingerprints and adds nothing.
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


// The amount and direction of one row, whatever the layout. null when the line
// has no money, as on a totals row.
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


// A fixed-length hash that identifies one transaction, for the UNIQUE index that
// makes re-importing safe.
function fingerprintFor(key, occurrence) {
  return crypto.createHash('sha256')
    .update(key + '|' + occurrence)
    .digest('hex')
    .slice(0, 32);
}


/*
  A readable merchant name from a narration:

    "UPI-SWIGGY-SWIGGY@YBL-YESB0000001-4839201-PAYMENT"  ->  "SWIGGY"

  The payment rail prefix is dropped and the rest is cut at the first separator.
*/
export function merchantName(description) {
  let text = String(description).toUpperCase();

  // The rail this went over. Not a merchant.
  text = text.replace(/^(UPI|NEFT|IMPS|POS|ACH|ATM|MMT)[-\s/]+/, '');
  text = text.replace(/^(DR|CR)[-\s/]+/, '');

  // A card terminal number starts a POS line and is followed by a space, which
  // stops this from removing a narration that is only a reference number.
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
