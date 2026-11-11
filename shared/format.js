/*
  Turning numbers and dates into text for people to read.

  Every page, the AI coach and the daily note format money and dates with these,
  so "₹13.8 L" or "August 2026" looks the same everywhere. If a figure looks
  wrongly written (not wrongly calculated), the bug is in this file.

  Nothing here calculates anything. The maths lives in plan.js, debt.js and so on.
*/

const ONE_LAKH = 100000;
const ONE_CRORE = 10000000;

// Shown when there is no number or no date to print. "₹NaN" on a page looks broken.
const NOTHING = '—';


// Money

/*
  A number as rupees, in the Indian style.

    formatRupees(62000)                     ->  "₹62,000"
    formatRupees(1380000, { short: true })  ->  "₹13.8 L"
    formatRupees(-850000, { short: true })  ->  "-₹8.5 L"

  The short form checks the size without the sign, so a negative net worth also
  gets the short form and fits its card.
*/
export function formatRupees(value, options) {
  if (!Number.isFinite(value)) {
    return '₹' + NOTHING;
  }

  const amount = Math.round(value);

  // The size of the number, without its sign.
  const size = Math.abs(amount);

  let sign = '';
  if (amount < 0) {
    sign = '-';
  }

  // options is optional, so it may be undefined.
  let useShortForm = false;
  if (options && options.short === true) {
    useShortForm = true;
  }

  if (useShortForm === true && size >= ONE_CRORE) {
    const crores = size / ONE_CRORE;
    return sign + '₹' + crores.toFixed(2) + ' Cr';
  }

  if (useShortForm === true && size >= ONE_LAKH) {
    const lakhs = size / ONE_LAKH;
    return sign + '₹' + lakhs.toFixed(1) + ' L';
  }

  // toLocaleString('en-IN') adds Indian-style commas: 6200000 becomes 62,00,000
  return sign + '₹' + size.toLocaleString('en-IN');
}


/* "₹13.8 L". Handy as a format function for CountUp and chart labels. */
export function formatRupeesShort(value) {
  return formatRupees(value, { short: true });
}


// Months and dates

/*
  'YYYY-MM' for the current month, which is the form the database stores.

  Uses the local clock, not toISOString (which is UTC). In India, UTC is five and
  a half hours behind, so just after midnight on the 1st the UTC month would
  still be last month.
*/
export function currentMonth() {
  const now = new Date();

  // getMonth counts from zero, and a single digit month has to keep its
  // leading zero or the text will not match what is stored.
  const month = String(now.getMonth() + 1).padStart(2, '0');

  return now.getFullYear() + '-' + month;
}


/*
  Turns '2026-08' into a Date for the 1st of that month.

  Day 1 rather than today's date, so a month with fewer days than today cannot
  roll the answer forward into the next one.
*/
function firstDayOf(monthText) {
  const year = Number(monthText.slice(0, 4));
  const month = Number(monthText.slice(5, 7));

  return new Date(year, month - 1, 1);
}


/* Date -> "March 2029". Used for payoff dates. */
export function formatMonthYear(date) {
  if (!date) {
    return NOTHING;
  }

  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}


/* '2026-08' -> "August 2026". */
export function monthLabel(monthText) {
  return formatMonthYear(firstDayOf(monthText));
}


/* '2026-08' -> "August". */
export function monthNameOnly(monthText) {
  return firstDayOf(monthText).toLocaleDateString('en-IN', { month: 'long' });
}


/* '2026-08-05' -> "05 Aug". Used for lines on a statement. */
export function formatDayMonth(dayText) {
  // T00:00:00 makes JavaScript read the date in local time, not UTC.
  const date = new Date(dayText + 'T00:00:00');
  const monthName = date.toLocaleDateString('en-IN', { month: 'short' });

  return dayText.slice(8) + ' ' + monthName;
}


/* "1 month" or "3 months". */
function countOf(number, singular, plural) {
  if (number === 1) {
    return number + ' ' + singular;
  }

  return number + ' ' + plural;
}


/* 52 -> "4 years 4 months", 7 -> "7 months", 0 -> "now". */
export function formatDuration(months) {
  if (months <= 0) {
    return 'now';
  }

  const years = Math.floor(months / 12);
  const leftover = months % 12;

  if (years === 0) {
    return countOf(leftover, 'month', 'months');
  }

  const yearText = countOf(years, 'year', 'years');

  if (leftover === 0) {
    return yearText;
  }

  return yearText + ' ' + countOf(leftover, 'month', 'months');
}
