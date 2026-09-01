import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/*
  Tests for the AI coach. Run with: npm test

  None of these calls Claude. A test that spends money and needs the internet
  to pass is not a test you will keep running, and the interesting part is not
  the model anyway: it is whether the right numbers reach the prompt.

  So this file checks the two halves that are ours. The question checker, and
  the text that gets built from somebody's real rows.

  It points the database at a throwaway file first, the same way api.test.js
  does, which is why lib/advice.js is loaded with "await import" further down.
  A normal import line runs before any other code in the file, so the database
  would be opened before we could say where it should be.
*/

const temporaryFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'nestworth-advice-'));
process.env.NESTWORTH_DB_FILE = path.join(temporaryFolder, 'test.db');

const db = (await import('../src/database/db.js')).default;
const { checkQuestion, factsToText, readFacts } = await import('../src/lib/advice.js');

// One person, with a bit of everything, so the prompt has something to say.
const now = new Date().toISOString();

db.prepare('INSERT INTO users (name, email, created_at) VALUES (?, ?, ?)')
  .run('Test Person', 'coach@example.com', now);

db.prepare(`
  INSERT INTO households (user_id, income, dependents, has_loan, income_varies, essential_costs, updated_at)
  VALUES (1, 62000, 2, 1, 0, 22000, ?)
`).run(now);

db.prepare(`
  INSERT INTO debts (user_id, name, kind, principal, annual_rate, emi, created_at, updated_at)
  VALUES (1, 'Credit card', 'credit_card', 84000, 38, 6000, ?, ?)
`).run(now, now);

// The EMI here has paise in it on purpose. See the rounding test below.
db.prepare(`
  INSERT INTO debts (user_id, name, kind, principal, annual_rate, emi, created_at, updated_at)
  VALUES (1, 'Education loan', 'education', 410000, 8.4, 7200.333, ?, ?)
`).run(now, now);

db.prepare(`
  INSERT INTO assets (user_id, name, kind, value, created_at, updated_at)
  VALUES (1, 'Savings account', 'cash', 95000, ?, ?)
`).run(now, now);

// A second person, whose only job is to prove they stay out of the first
// person's prompt.
db.prepare('INSERT INTO users (name, email, created_at) VALUES (?, ?, ?)')
  .run('Somebody Else', 'other@example.com', now);

db.prepare(`
  INSERT INTO debts (user_id, name, kind, principal, annual_rate, emi, created_at, updated_at)
  VALUES (2, 'Secret loan of a stranger', 'personal', 999999, 12, 5000, ?, ?)
`).run(now, now);


// ---------------------------------------------------------------
// The question box
// ---------------------------------------------------------------

// These return an error message when something is wrong and an empty string
// when it is fine, so an empty string means the question was accepted.

test('checkQuestion accepts an ordinary question', () => {
  assert.equal(checkQuestion('Which debt should I clear first?'), '');
});

test('checkQuestion accepts no question at all', () => {
  // The dashboard button sends nothing, which means "tell me what to do next".
  assert.equal(checkQuestion(''), '');
  assert.equal(checkQuestion(undefined), '');
});

test('checkQuestion rejects something far too long to be a question', () => {
  assert.notEqual(checkQuestion('a'.repeat(400)), '');
});


// ---------------------------------------------------------------
// The facts that go into the prompt
// ---------------------------------------------------------------

test('readFacts adds up the totals itself', () => {
  const facts = readFacts(1);

  assert.equal(facts.totalOwed, 494000);
  assert.equal(facts.totalOwned, 95000);
  assert.equal(facts.netWorth, -399000);
});

test('readFacts puts the most expensive debt first', () => {
  const facts = readFacts(1);

  // The prompt tells the model the list is sorted by rate, so it has to be.
  assert.equal(facts.debts[0].name, 'Credit card');
  assert.equal(facts.debts[0].annual_rate, 38);
});

test('readFacts never reaches another person’s rows', () => {
  // The whole security argument of this feature in one line: the user id comes
  // from the session cookie, so there is no way to ask about somebody else.
  const text = factsToText(readFacts(1));

  assert.equal(text.includes('Secret loan of a stranger'), false);
});

test('factsToText rounds money to whole rupees', () => {
  const text = factsToText(readFacts(1));

  // An EMI is stored as REAL because it can have paise in it. Ten of those
  // added together produce things like 13200.000000000002, which is not
  // something to put in front of a model or a person.
  assert.equal(text.includes('EMI ₹7200 a month'), true);
  assert.equal(text.includes('7200.333'), false);
});

test('factsToText names each debt with its rate and balance', () => {
  const text = factsToText(readFacts(1));

  assert.equal(text.includes('Credit card: ₹84000 still owed at 38% a year'), true);
});

test('factsToText says what is missing rather than leaving a gap', () => {
  // This person has no goals and no check-ins. Silence would read to the model
  // as "not applicable"; a sentence lets it suggest adding them.
  const text = factsToText(readFacts(1));

  assert.equal(text.includes('No goals recorded.'), true);
  assert.equal(text.includes('No months recorded yet.'), true);
});


test('the totals count every row, even when the list is capped', () => {
  /*
    Only the first twenty debts go into the prompt, because every row costs
    money to send. The totals must still be added up from all of them: a
    summary that quietly stopped at twenty would be wrong, and a wrong number
    is the one thing this file exists to prevent.
  */
  const stamp = new Date().toISOString();

  const insert = db.prepare(`
    INSERT INTO debts (user_id, name, kind, principal, annual_rate, emi, created_at, updated_at)
    VALUES (3, ?, 'other', 1000, ?, 100, ?, ?)
  `);

  // A third person with far more debts than the cap allows.
  db.prepare('INSERT INTO users (name, email, created_at) VALUES (?, ?, ?)')
    .run('Many Debts', 'many@example.com', stamp);

  for (let number = 1; number <= 30; number = number + 1) {
    // Descending rates, so the cap keeps the expensive ones.
    insert.run('Debt ' + number, 30 - number * 0.5, stamp, stamp);
  }

  const facts = readFacts(3);

  assert.equal(facts.debts.length, 20, 'the prompt list is capped');
  assert.equal(facts.totalOwed, 30000, 'the total counts all thirty');
  assert.equal(facts.totalEmi, 3000);
});


test('a person with nothing entered gets zeros, not nulls', () => {
  // SUM over no rows returns NULL in SQL, which would print "₹null" in the
  // prompt. COALESCE in readFacts turns it into 0.
  const stamp = new Date().toISOString();

  db.prepare('INSERT INTO users (name, email, created_at) VALUES (?, ?, ?)')
    .run('Empty', 'empty@example.com', stamp);

  const facts = readFacts(4);

  assert.equal(facts.totalOwed, 0);
  assert.equal(facts.totalOwned, 0);
  assert.equal(facts.netWorth, 0);
});
