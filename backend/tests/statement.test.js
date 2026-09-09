import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAmount, parseDate, parseStatement, splitCsvLine } from '../src/lib/statement.js';
import { categorise } from '../src/lib/categorise.js';

/*
  The statement reader, one function at a time. No server and no database here.

  Every expected value below was worked out by hand. That matters more for this
  file than for most: a parser that gets a date or a sign wrong does not throw.
  It returns a number, in the right format, in the right place on the page, and
  it is simply not true.
*/


// ---------------------------------------------------------------
// Splitting a line
// ---------------------------------------------------------------

test('a plain line splits on its commas', () => {
  assert.deepEqual(splitCsvLine('01/08/2026,SALARY,,85000'), ['01/08/2026', 'SALARY', '', '85000']);
});

test('a comma inside quotes is part of the text, not a separator', () => {
  // This is the whole reason the splitter exists. Bank narrations contain
  // commas constantly, and a plain split() would turn one field into three and
  // push every column after it along by two.
  const fields = splitCsvLine('01/08/2026,"SWIGGY, BANGALORE",420,');

  assert.equal(fields.length, 4);
  assert.equal(fields[1], 'SWIGGY, BANGALORE');
  assert.equal(fields[2], '420');
});

test('a doubled quote inside a quoted field is one real quote', () => {
  const fields = splitCsvLine('a,"he said ""hi""",b');

  assert.equal(fields[1], 'he said "hi"');
});


// ---------------------------------------------------------------
// Dates
// ---------------------------------------------------------------

test('the three date shapes banks use all come out the same way', () => {
  assert.equal(parseDate('2026-08-05'), '2026-08-05');
  assert.equal(parseDate('05/08/2026'), '2026-08-05');
  assert.equal(parseDate('05-08-26'), '2026-08-05');
  assert.equal(parseDate('05-Aug-2026'), '2026-08-05');
  assert.equal(parseDate('5 August 2026'), '2026-08-05');
});

test('a slashed date is read day first, not month first', () => {
  // 05/01 is the fifth of January here, not the first of May. There is no way
  // to tell from the text, so it is a decision, and this test is what stops it
  // being changed by accident.
  assert.equal(parseDate('05/01/2026'), '2026-01-05');
});

test('anything that is not a date comes back empty rather than as a wrong date', () => {
  assert.equal(parseDate('Opening Balance'), '');
  assert.equal(parseDate(''), '');
  assert.equal(parseDate('45/13/2026'), '');
});


// ---------------------------------------------------------------
// Amounts
// ---------------------------------------------------------------

test('an amount survives the rupee sign, the commas and the spaces', () => {
  assert.equal(parseAmount(' ₹1,23,456.78 '), 123456.78);
  assert.equal(parseAmount('85,000.00'), 85000);
});

test('an empty cell is nothing, not an error', () => {
  // A blank Withdrawal column means no money went out on that line. Treating it
  // as unreadable would throw away every deposit in the file.
  assert.equal(parseAmount(''), 0);
  assert.equal(parseAmount('-'), 0);
});

test('brackets mean a negative', () => {
  assert.equal(parseAmount('(500.00)'), -500);
});


// ---------------------------------------------------------------
// Categories
// ---------------------------------------------------------------

test('known merchants land in the right category', () => {
  assert.equal(categorise('UPI-SWIGGY-SWIGGY@YBL-PAYMENT', 'debit'), 'food');
  assert.equal(categorise('NEFT DR-RENT AUGUST-LANDLORD', 'debit'), 'rent');
  assert.equal(categorise('ZERODHA BROKING SIP', 'debit'), 'investment');
  assert.equal(categorise('AIRTEL POSTPAID BILL', 'debit'), 'bills');
  assert.equal(categorise('UBER INDIA SYSTEMS', 'debit'), 'transport');
});

test('a merchant nobody has written down says so instead of guessing', () => {
  assert.equal(categorise('POS 4823 SOME LOCAL SHOP', 'debit'), 'other');
});

test('money arriving with no explanation is income', () => {
  assert.equal(categorise('NEFT FROM SOMEBODY', 'credit'), 'income');
});

test('the direction wins over the words', () => {
  // "SALARY" appears in the income rule, but this money is leaving the account,
  // so it cannot be income. Without the direction check the month's income
  // would include a payment out, and nothing on screen would look wrong.
  assert.notEqual(categorise('SALARY ADVANCE REPAYMENT', 'debit'), 'income');
});


// ---------------------------------------------------------------
// A whole file
// ---------------------------------------------------------------

const HDFC_STYLE = [
  'Account Number: XXXXXXXX1234',
  'Statement from 01/08/2026 to 31/08/2026',
  '',
  'Date,Narration,Withdrawal Amt.,Deposit Amt.,Closing Balance',
  '01/08/2026,SALARY AUG 2026 ACME PVT LTD,,85000.00,120000.00',
  '02/08/2026,"UPI-SWIGGY-SWIGGY@YBL, ORDER",420.00,,119580.00',
  '02/08/2026,UPI-SWIGGY-SWIGGY@YBL,420.00,,119160.00',
  '03/08/2026,NEFT DR-RENT AUGUST-LANDLORD,22000.00,,97160.00',
  '05/08/2026,ZERODHA BROKING SIP,5000.00,,92160.00',
  'Total,,27840.00,85000.00,',
].join('\n');

test('a statement with a preamble finds its own header row', () => {
  const parsed = parseStatement(HDFC_STYLE);

  assert.equal(parsed.error, '');
  assert.equal(parsed.rows.length, 5);
  assert.equal(parsed.rows[0].description, 'SALARY AUG 2026 ACME PVT LTD');
});

test('the totals row at the bottom is skipped rather than imported as a transaction', () => {
  const parsed = parseStatement(HDFC_STYLE);

  assert.equal(parsed.skipped, 1);
});

test('two identical payments on the same day are both kept', () => {
  // Two ₹420 Swiggy orders on the same day are two real payments that produce
  // near identical lines. If the fingerprint ignored the repeat, one of them
  // would silently vanish and the month would be ₹420 short.
  const parsed = parseStatement(HDFC_STYLE);

  const swiggy = parsed.rows.filter((row) => {
    return row.category === 'food';
  });

  assert.equal(swiggy.length, 2);
  assert.notEqual(swiggy[0].fingerprint, swiggy[1].fingerprint);
});

test('the same file read twice produces the same fingerprints', () => {
  // This is what makes a second import add nothing. If the fingerprints moved
  // between runs, re-importing a statement would double every figure on the
  // page and look entirely believable.
  const first = parseStatement(HDFC_STYLE);
  const second = parseStatement(HDFC_STYLE);

  const firstPrints = first.rows.map((row) => {
    return row.fingerprint;
  });

  const secondPrints = second.rows.map((row) => {
    return row.fingerprint;
  });

  assert.deepEqual(firstPrints, secondPrints);
});

test('a single amount column with a Dr/Cr marker works too', () => {
  const icici = [
    'Transaction Date,Transaction Remarks,Amount,Type',
    '05-Aug-2026,SALARY CREDIT,85000,CR',
    '06-Aug-2026,BIGBASKET ONLINE,3200,DR',
  ].join('\n');

  const parsed = parseStatement(icici);

  assert.equal(parsed.rows.length, 2);
  assert.equal(parsed.rows[0].direction, 'credit');
  assert.equal(parsed.rows[1].direction, 'debit');
  assert.equal(parsed.rows[1].category, 'groceries');
});

test('a file with no recognisable headings is refused with a reason', () => {
  const parsed = parseStatement('some,random,text\n1,2,3');

  assert.equal(parsed.rows.length, 0);
  assert.match(parsed.error, /column headings/);
});


// ---------------------------------------------------------------
// Getting a name out of a narration
// ---------------------------------------------------------------

test('the payment rail and the routing junk are dropped from a merchant name', async () => {
  const { merchantName } = await import('../src/lib/statement.js');

  assert.equal(merchantName('UPI-SWIGGY-SWIGGY@YBL-YESB0000001-4839201-PAYMENT'), 'SWIGGY');
  assert.equal(merchantName('NEFT DR-RENT AUGUST-K RAMESH'), 'RENT AUGUST');
  assert.equal(merchantName('POS 8823 SRI KRISHNA STORES'), 'SRI KRISHNA STORES');
});

test('a narration that is only a reference number keeps the whole line', async () => {
  // "4839201" as the name of something you paid forty times would be worse
  // than an untidy label. At least the full line can be recognised.
  const { merchantName } = await import('../src/lib/statement.js');

  assert.equal(merchantName('UPI-483920175-PAYMENT'), '483920175-PAYMENT');
});
