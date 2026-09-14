import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/*
  Tests for the calculations Claude is allowed to run. Run with: npm test

  Nothing here calls Claude. What is worth testing is not the model, it is the
  seven functions it can ask for: that they read the right person's rows, that
  they produce the same answers the app's own pages produce, and that a bad
  argument comes back as a sentence rather than a crash.

  That last one matters more than it looks. Claude decides what to pass, and it
  will sometimes pass a debt name that does not quite match or leave a field
  out. Every one of those has to return text it can read and recover from,
  because a thrown error takes the whole answer down.

  The throwaway database is set up first, which is why lib/tools.js is loaded
  with "await import" below.
*/

const temporaryFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'nestworth-tools-'));
process.env.NESTWORTH_DB_FILE = path.join(temporaryFolder, 'test.db');

const db = (await import('../src/database/db.js')).default;
const { describeTool, runTool, toolDefinitions } = await import('../src/ai/tools.js');
const { payoff } = await import('../../shared/debt.js');

const now = new Date().toISOString();

db.prepare('INSERT INTO users (name, email, created_at) VALUES (?, ?, ?)')
  .run('Test Person', 'tools@example.com', now);

db.prepare(`
  INSERT INTO households (user_id, income, dependents, has_loan, income_varies, essential_costs, updated_at)
  VALUES (1, 62000, 2, 1, 0, 22000, ?)
`).run(now);

// An EMI below the monthly interest, so this one never clears on its own.
db.prepare(`
  INSERT INTO debts (user_id, name, kind, principal, annual_rate, emi, created_at, updated_at)
  VALUES (1, 'HDFC Credit Card', 'credit_card', 84000, 42, 2800, ?, ?)
`).run(now, now);

db.prepare(`
  INSERT INTO debts (user_id, name, kind, principal, annual_rate, emi, created_at, updated_at)
  VALUES (1, 'Education loan', 'education', 410000, 8.4, 7200, ?, ?)
`).run(now, now);

db.prepare(`
  INSERT INTO assets (user_id, name, kind, value, created_at, updated_at)
  VALUES (1, 'Savings', 'cash', 95000, ?, ?)
`).run(now, now);

// Not liquid, so it must NOT count towards the emergency fund.
db.prepare(`
  INSERT INTO assets (user_id, name, kind, value, created_at, updated_at)
  VALUES (1, 'Flat', 'property', 4000000, ?, ?)
`).run(now, now);

// A second person, to prove the tools cannot reach across.
db.prepare('INSERT INTO users (name, email, created_at) VALUES (?, ?, ?)')
  .run('Somebody Else', 'other@example.com', now);

db.prepare(`
  INSERT INTO households (user_id, income, dependents, has_loan, income_varies, essential_costs, updated_at)
  VALUES (2, 200000, 0, 0, 0, 30000, ?)
`).run(now);

db.prepare(`
  INSERT INTO debts (user_id, name, kind, principal, annual_rate, emi, created_at, updated_at)
  VALUES (2, 'Stranger loan', 'personal', 50000, 15, 3000, ?, ?)
`).run(now, now);


// ---------------------------------------------------------------
// What Claude is offered
// ---------------------------------------------------------------

test('every tool is described well enough for Claude to choose it', () => {
  const tools = toolDefinitions();

  assert.equal(tools.length, 7);

  for (const tool of tools) {
    assert.ok(tool.name.length > 0);

    // A one-line description tells Claude what the tool does but not when to
    // reach for it, which is the only decision it has to make.
    assert.ok(tool.description.length > 80, tool.name + ' needs a fuller description');

    assert.equal(tool.input_schema.type, 'object');
  }
});


// ---------------------------------------------------------------
// simulate_extra_payment
// ---------------------------------------------------------------

test('the payoff tool agrees with the payoff function the app draws with', () => {
  /*
    This is the whole reason the maths lives in shared/. If the tool and the
    debts page ever disagreed, the coach would confidently contradict the
    screen the person is looking at, and there would be no way to tell which
    of the two was right.
  */
  const answer = runTool(1, 'simulate_extra_payment', {
    debt_name: 'Education loan',
    extra_per_month: 3000,
  });

  const direct = payoff(410000, 8.4, 7200 + 3000, 0);
  const expectedYears = Math.floor(direct.months / 12);

  assert.ok(direct.clears);
  assert.ok(answer.includes(String(expectedYears) + ' year'), answer);
});


test('the payoff tool reports a debt that turns around', () => {
  // The card at 42% never clears on its EMI alone. Extra changes that, and
  // saying so is the most useful thing this tool does.
  const answer = runTool(1, 'simulate_extra_payment', {
    debt_name: 'HDFC Credit Card',
    extra_per_month: 3000,
  });

  assert.ok(answer.includes('never clears'), answer);
  assert.ok(answer.includes('difference between never finishing and finishing'), answer);
});


test('a name that is close enough still finds the right debt', () => {
  // Claude passes something close, not something identical. Asked about "the
  // credit card" it will not type "HDFC Credit Card" back exactly.
  const answer = runTool(1, 'simulate_extra_payment', {
    debt_name: 'credit card',
    extra_per_month: 1000,
  });

  assert.ok(answer.includes('HDFC Credit Card'), answer);
});


test('a debt that does not exist comes back as a sentence, not a crash', () => {
  const answer = runTool(1, 'simulate_extra_payment', {
    debt_name: 'car loan',
    extra_per_month: 1000,
  });

  assert.ok(answer.includes('no debt called'), answer);

  // It lists what there IS, so Claude can correct itself in the next round
  // instead of apologising.
  assert.ok(answer.includes('Education loan'), answer);
});


test('a missing argument comes back as a sentence too', () => {
  assert.ok(runTool(1, 'simulate_extra_payment', {}).includes('did not say which debt'));
  assert.ok(runTool(1, 'simulate_extra_payment', null).includes('did not say which debt'));
});


test('a negative extra payment is refused', () => {
  const answer = runTool(1, 'simulate_extra_payment', {
    debt_name: 'Education loan',
    extra_per_month: -500,
  });

  assert.ok(answer.includes('zero or more'), answer);
});


// ---------------------------------------------------------------
// simulate_household_change
// ---------------------------------------------------------------

test('changing one thing leaves everything else alone', () => {
  /*
    Only the fields Claude passes are meant to change. Rent going up must not
    quietly reset the income or the dependents to nothing, which is what would
    happen if a missing field were read as zero.
  */
  const answer = runTool(1, 'simulate_household_change', { essential_costs: 27000 });

  // Income 62000, support for 2 dependents, EMI 10000, essentials 22000 -> 15000 free.
  assert.ok(answer.includes('₹15,000 a month is left'), answer);

  // 5000 more on rent takes 5000 off what is left.
  assert.ok(answer.includes('₹10,000 a month is left'), answer);
  assert.ok(answer.includes('₹5,000 a month less'), answer);
});


test('a raise shows up as more to decide about', () => {
  const answer = runTool(1, 'simulate_household_change', { income: 90000 });

  assert.ok(answer.includes('a month more to decide about'), answer);
});


test('changing nothing says so rather than pretending something happened', () => {
  const answer = runTool(1, 'simulate_household_change', {});

  assert.ok(answer.includes('changes nothing'), answer);
});


// ---------------------------------------------------------------
// check_goals and emergency_fund
// ---------------------------------------------------------------

test('the goals tool says so when there are none', () => {
  assert.ok(runTool(1, 'check_goals', {}).includes('no goals recorded'));
});


test('the goals tool compares what they need against what the plan saves', () => {
  const stamp = new Date().toISOString();

  db.prepare(`
    INSERT INTO goals (user_id, name, target_amount, saved_amount, target_date, created_at, updated_at)
    VALUES (1, 'Emergency fund', 300000, 95000, '2030-01-01', ?, ?)
  `).run(stamp, stamp);

  const answer = runTool(1, 'check_goals', {});

  assert.ok(answer.includes('sets aside'), answer);
  assert.ok(answer.includes('a month'), answer);
});


test('the emergency fund counts cash but not the flat', () => {
  /*
    This person owns a ₹40,00,000 flat and has ₹95,000 in savings. Only the
    savings count: selling a flat to cover a bad month is not a plan, and a
    tool that counted it would tell somebody they were fine when they are not.
  */
  const answer = runTool(1, 'emergency_fund', {});

  assert.ok(answer.includes('₹95,000'), answer);
  assert.ok(answer.includes('40,00,000') === false, 'the flat must not be counted');

  // Two dependents means a six month target rather than three.
  assert.ok(answer.includes('6 months'), answer);
});


test('regression: the emergency fund counts rent and bills as a month of costs', () => {
  // Income 62000, 2 dependents (support 15000), EMI 10000, essentials 22000.
  // What is left is 15000 and the plan spends part of it. A month must cost
  // more than the 47000 of fixed outgoings, which the old sum did not reach.
  const answer = runTool(1, 'emergency_fund', {});
  const match = answer.match(/One month costs about ₹([\d,]+)/);

  assert.ok(match, answer);

  const monthCost = Number(match[1].replaceAll(',', ''));

  assert.ok(monthCost > 47000, 'a month costs ' + monthCost + ', which leaves out rent');
});


// ---------------------------------------------------------------
// Family and the stress test
// ---------------------------------------------------------------

test('extra family support comes off what is left each month', () => {
  const answer = runTool(1, 'simulate_household_change', { extra_family_support: 4000 });

  assert.ok(answer.includes('₹4,000 a month less'), answer);
});


test('the stress test reports when the cash runs out', () => {
  const answer = runTool(1, 'stress_test', { shock: 'job_loss', months: 6 });

  assert.ok(answer.includes('Your income stops for 6 months'), answer);
  assert.ok(answer.includes('Lowest point'), answer);
  assert.ok(answer.includes('runs out') || answer.includes('get through it'), answer);
});


test('an unknown shock is refused with the list of real ones', () => {
  const answer = runTool(1, 'stress_test', { shock: 'zombies' });

  assert.ok(answer.includes('no shock called'), answer);
  assert.ok(answer.includes('job_loss'), answer);
});


test('a hospital bill names the family member without cover', () => {
  const stamp = new Date().toISOString();

  db.prepare(`
    INSERT INTO family_members
      (user_id, name, relation, monthly_support, has_health_cover, created_at, updated_at)
    VALUES (1, 'Nani', 'grandparent', 6000, 0, ?, ?)
  `).run(stamp, stamp);

  const answer = runTool(1, 'stress_test', { shock: 'medical', amount: 200000 });

  assert.ok(answer.includes('Nani'), answer);

  // Tidy up so the tests below still see the household without a family list.
  db.prepare("DELETE FROM family_members WHERE user_id = 1 AND name = 'Nani'").run();
});


test('a tool asked about somebody with no household says so', () => {
  const stamp = new Date().toISOString();

  const result = db.prepare('INSERT INTO users (name, email, created_at) VALUES (?, ?, ?)')
    .run('New Person', 'new-tools@example.com', stamp);

  const answer = runTool(result.lastInsertRowid, 'stress_test', { shock: 'job_loss' });

  assert.ok(answer.includes('household questions'), answer);
});


// ---------------------------------------------------------------
// The rule that matters most
// ---------------------------------------------------------------

test('no tool can reach another person’s money', () => {
  /*
    Every tool takes the user id from the session, never from anything Claude
    said. There is no argument any of them accept that names a person, which
    is what makes this safe rather than merely untested.
  */
  const answers = [
    runTool(1, 'simulate_extra_payment', { debt_name: 'Stranger loan', extra_per_month: 500 }),
    runTool(1, 'simulate_household_change', {}),
    runTool(1, 'check_goals', {}),
    runTool(1, 'emergency_fund', {}),
    runTool(1, 'compare_plans', {}),
    runTool(1, 'stress_test', { shock: 'job_loss', months: 3 }),
  ];

  /*
    What must never appear is the other person's FIGURES. Asking for a debt by
    a name they happen to use is refused, and the refusal repeats the name back
    because that is the string Claude typed, not something read out of the
    database. It never confirms whether such a debt exists for anybody else.
  */
  for (const answer of answers) {
    assert.equal(answer.includes('₹50,000'), false, 'their balance leaked: ' + answer);
    assert.equal(answer.includes('₹2,00,000'), false, 'their income leaked: ' + answer);
    assert.equal(answer.includes('₹3,000'), false, 'their EMI leaked: ' + answer);
  }

  // And the refusal offers only this person's own debts as alternatives.
  const refusal = answers[0];

  assert.ok(refusal.includes('no debt called'), refusal);
  assert.ok(refusal.includes('HDFC Credit Card'), refusal);
  assert.ok(refusal.includes('Education loan'), refusal);
});


test('an unknown tool name is refused rather than thrown', () => {
  assert.ok(runTool(1, 'drop_all_tables', {}).includes('no tool called'));
});


test('every tool has a line the browser can show while it runs', () => {
  for (const tool of toolDefinitions()) {
    const label = describeTool(tool.name, { debt_name: 'Card' });

    assert.equal(typeof label, 'string');
    assert.ok(label.length > 0, tool.name);
  }
});
