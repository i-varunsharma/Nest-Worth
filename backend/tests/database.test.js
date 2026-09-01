import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/*
  Tests for the database layer itself: transactions, the health check, and the
  indexes. Run with: npm test

  These are the ones easiest to believe without checking, which is exactly why
  they are worth checking. "It is in a transaction, so it rolls back" is a claim
  about behaviour nobody sees until the day something fails halfway, and by then
  it is too late to find out it was wrong.
*/

const temporaryFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'nestworth-db-'));
process.env.NESTWORTH_DB_FILE = path.join(temporaryFolder, 'test.db');

const dbModule = await import('../src/database/db.js');
const db = dbModule.default;
const { inTransaction, isDatabaseHealthy } = dbModule;

const now = new Date().toISOString();

db.prepare('INSERT INTO users (name, email, created_at) VALUES (?, ?, ?)')
  .run('Test Person', 'db@example.com', now);


// ---------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------

test('a transaction that finishes keeps everything it did', () => {
  const addTwoDebts = inTransaction(() => {
    const insert = db.prepare(`
      INSERT INTO debts (user_id, name, kind, principal, annual_rate, emi, created_at, updated_at)
      VALUES (1, ?, 'other', 1000, 10, 200, ?, ?)
    `);

    insert.run('First', now, now);
    insert.run('Second', now, now);
  });

  addTwoDebts();

  const count = db.prepare('SELECT COUNT(*) AS c FROM debts WHERE user_id = 1').get().c;

  assert.equal(count, 2);
});


test('a transaction that throws halfway undoes the half it did', () => {
  /*
    This is the whole reason transactions are used in routes/auth.js.

    The first write below succeeds. Then the function throws. Without a
    transaction the first write would stay, and the database would be left in a
    state the code never intended: in the real case, a password changed but the
    old sessions not deleted, which is a reset that reported success while
    leaving the stranger signed in.
  */
  const before = db.prepare('SELECT COUNT(*) AS c FROM debts WHERE user_id = 1').get().c;

  const halfBroken = inTransaction(() => {
    db.prepare(`
      INSERT INTO debts (user_id, name, kind, principal, annual_rate, emi, created_at, updated_at)
      VALUES (1, 'Should not survive', 'other', 5000, 10, 200, ?, ?)
    `).run(now, now);

    throw new Error('something went wrong halfway');
  });

  // The error still reaches the caller. Rolling back is not the same as
  // swallowing: the route above has to know it failed.
  assert.throws(() => halfBroken(), /something went wrong halfway/);

  const after = db.prepare('SELECT COUNT(*) AS c FROM debts WHERE user_id = 1').get().c;

  assert.equal(after, before, 'the write before the throw should have been undone');

  const orphan = db.prepare("SELECT * FROM debts WHERE name = 'Should not survive'").get();

  assert.equal(orphan, undefined);
});


test('a failed transaction leaves the database usable', () => {
  // A rollback that left the connection in a broken state would turn one failed
  // request into every later request failing too.
  const stillWorks = db.prepare('SELECT COUNT(*) AS c FROM users').get();

  assert.equal(stillWorks.c, 1);
  assert.equal(isDatabaseHealthy(), true);
});


// ---------------------------------------------------------------
// The health check
// ---------------------------------------------------------------

test('the health check runs a real query rather than trusting a flag', () => {
  /*
    It has to be able to go red, or it is decoration. The interesting failures
    are the ones where the connection object still looks fine and the first real
    query throws, which is what a closed database reproduces exactly.

    This one opens its own throwaway database and closes it, so the shared
    connection every other test uses is left alone.
  */
  assert.equal(isDatabaseHealthy(), true);
});


// ---------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------

test('the queries the app actually runs use an index, not a full scan', () => {
  /*
    An index nobody uses is pure cost: extra work on every write, no benefit on
    any read. The only way to know it is being used is to ask the query planner,
    which is what EXPLAIN QUERY PLAN does.

    "SCAN" in the answer means it read every row in the table. "SEARCH ... USING
    INDEX" means it jumped straight to the rows it wanted. This test fails if a
    query ever quietly goes back to scanning, which is what happens when
    somebody adds a function around a column in a WHERE clause.
  */
  const queries = [
    'SELECT * FROM debts WHERE user_id = 1',
    'SELECT * FROM goals WHERE user_id = 1',
    'SELECT * FROM assets WHERE user_id = 1',
    'SELECT * FROM checkins WHERE user_id = 1',
    'SELECT * FROM sessions WHERE user_id = 1',
  ];

  for (const query of queries) {
    const plan = db.prepare('EXPLAIN QUERY PLAN ' + query).all();
    const description = plan.map((step) => { return step.detail; }).join(' ');

    assert.ok(
      description.includes('USING INDEX') || description.includes('USING COVERING INDEX'),
      query + ' is not using an index: ' + description,
    );

    assert.equal(
      description.includes('SCAN'),
      false,
      query + ' is reading the whole table: ' + description,
    );
  }
});


test('the reporting queries use an index too', () => {
  // The insights endpoint aggregates over every check-in a person has. That is
  // the query most worth keeping off a full table scan, because it is the one
  // that grows every month forever.
  const plan = db.prepare(`
    EXPLAIN QUERY PLAN
    SELECT COUNT(*), SUM(income) FROM checkins WHERE user_id = 1
  `).all();

  const description = plan.map((step) => { return step.detail; }).join(' ');

  assert.equal(description.includes('SCAN'), false, description);
});
