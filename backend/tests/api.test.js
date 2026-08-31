import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/*
  Tests that go through the real API over HTTP.

  The other two files check one function at a time. This one starts the server
  and talks to it the way the React app does, which is the only way to catch a
  route that is perfect but was never added in app.js.

  First it points the server at a throwaway database in a temporary folder, so
  a test run can never damage the database you have been building with.

  That is why app.js is loaded further down with "await import" rather than a
  normal import line. Normal imports all run before any other code in the file,
  so the database would be opened before we could say where it should be.
*/

const temporaryFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'nestworth-test-'));
process.env.NESTWORTH_DB_FILE = path.join(temporaryFolder, 'test.db');

/*
  Turn the rate limiter off for this run.

  This file makes a fresh account for nearly every test, which to the server is
  one address creating a dozen accounts in two seconds: exactly what the limiter
  exists to refuse. Left on, every test after the fifth fails with a 429.

  The limiter is still tested, in rateLimit.test.js, which checks its counting
  rules directly.
*/
process.env.DISABLE_RATE_LIMIT = 'true';

// Now, and only now, is it safe to load the app.
const { createApp } = await import('../src/app.js');


// Port 0 means any free port. Asking for a specific one would fail whenever
// the real server was already running, which is most of the time.
const app = createApp();
const server = app.listen(0);

await new Promise((resolve) => {
  server.on('listening', resolve);
});

const BASE = 'http://localhost:' + server.address().port;

// Without this the test process stays alive holding an open port, and the run
// never finishes.
test.after(() => {
  server.close();
  fs.rmSync(temporaryFolder, { recursive: true, force: true });
});


/*
  Sends one request and returns the status, the body and any cookie.

  The session lives in a cookie, so a test that wants to be signed in has to
  catch the cookie from signing up and send it back afterwards. A browser does
  this on its own.
*/
async function call(method, path, options) {
  let body = null;
  let cookie = null;

  if (options) {
    if (options.body) {
      body = options.body;
    }
    if (options.cookie) {
      cookie = options.cookie;
    }
  }

  const headers = { 'Content-Type': 'application/json' };
  if (cookie) {
    headers.Cookie = cookie;
  }

  const fetchOptions = { method: method, headers: headers };
  if (body) {
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(BASE + path, fetchOptions);
  const data = await response.json();

  // The cookie arrives as one long header. Everything before the first
  // semicolon is the name and value, which is all we need to send back.
  let setCookie = response.headers.get('set-cookie');
  if (setCookie) {
    setCookie = setCookie.split(';')[0];
  }

  return { status: response.status, data: data, cookie: setCookie };
}


/*
  Makes a new account and returns its cookie. Every test gets its own, or one
  test's leftovers change what another one sees.
*/
let accountCounter = 0;

async function makeAccount() {
  accountCounter = accountCounter + 1;

  const email = 'tester' + accountCounter + '@example.com';
  const password = 'testpassword' + accountCounter;

  const result = await call('POST', '/api/auth/signup', {
    body: { name: 'Tester ' + accountCounter, email: email, password: password },
  });

  assert.equal(result.status, 201, 'signup should have worked');

  return { cookie: result.cookie, email: email, password: password };
}


// ---------------------------------------------------------------
// The server is alive
// ---------------------------------------------------------------

test('the health check answers', async () => {
  const result = await call('GET', '/api/health');

  assert.equal(result.status, 200);
  assert.equal(result.data.ok, true);
});


test('an unknown address gives a clear 404', async () => {
  const result = await call('GET', '/api/nonsense');

  assert.equal(result.status, 404);
  assert.ok(result.data.error);
});


// ---------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------

test('signing up creates an account and signs the person in', async () => {
  const account = await makeAccount();

  const me = await call('GET', '/api/auth/me', { cookie: account.cookie });

  assert.equal(me.status, 200);
  assert.equal(me.data.user.email, account.email);
});


test('the password hash never leaves the server', async () => {
  // Every route builds its answer through a small function listing the fields
  // allowed out, rather than sending the database row as it is. This fails the
  // day somebody replaces that with res.json({ user }).
  const account = await makeAccount();
  const me = await call('GET', '/api/auth/me', { cookie: account.cookie });

  assert.equal(me.data.user.password_hash, undefined);
  assert.equal(me.data.user.passwordHash, undefined);
});


test('the same email cannot be used twice', async () => {
  const account = await makeAccount();

  const again = await call('POST', '/api/auth/signup', {
    body: { name: 'Impostor', email: account.email, password: 'anotherpassword' },
  });

  // 409 means "conflict", which is the right answer for something that already
  // exists.
  assert.equal(again.status, 409);
});


test('signing in with the wrong password is refused', async () => {
  const account = await makeAccount();

  const result = await call('POST', '/api/auth/login', {
    body: { email: account.email, password: 'not-the-password' },
  });

  assert.equal(result.status, 401);

  // The message must not reveal whether the account exists, or the endpoint
  // becomes a way to find out who has signed up here.
  const unknown = await call('POST', '/api/auth/login', {
    body: { email: 'nobody-at-all@example.com', password: 'not-the-password' },
  });

  assert.equal(unknown.data.error, result.data.error);
});


test('signing out makes the old cookie useless', async () => {
  const account = await makeAccount();

  await call('POST', '/api/auth/logout', { cookie: account.cookie });

  const me = await call('GET', '/api/auth/me', { cookie: account.cookie });

  assert.equal(me.status, 401);
});


// ---------------------------------------------------------------
// Nothing private is readable without signing in
// ---------------------------------------------------------------

test('every private route refuses a request with no cookie', async () => {
  const privatePaths = [
    '/api/household',
    '/api/debts',
    '/api/goals',
    '/api/assets',
    '/api/checkins',
  ];

  for (const path of privatePaths) {
    const result = await call('GET', path);
    assert.equal(result.status, 401, path + ' should have refused');
  }
});


// ---------------------------------------------------------------
// Saving and reading a person's own data
// ---------------------------------------------------------------

test('a household can be saved and read back', async () => {
  const account = await makeAccount();

  // isSaved: false is what sends a new person to onboarding rather than an
  // empty dashboard.
  const before = await call('GET', '/api/household', { cookie: account.cookie });
  assert.equal(before.data.household.isSaved, false);

  const saved = await call('PUT', '/api/household', {
    cookie: account.cookie,
    body: { income: 75000, dependents: 3, hasLoan: true },
  });

  assert.equal(saved.status, 200);

  const after = await call('GET', '/api/household', { cookie: account.cookie });

  assert.equal(after.data.household.income, 75000);
  assert.equal(after.data.household.dependents, 3);

  // SQLite stores 1 and 0, so this also checks the conversion back to a real
  // true. Getting it wrong silently breaks a checkbox.
  assert.equal(after.data.household.hasLoan, true);
  assert.equal(after.data.household.isSaved, true);
});


test('a varying income is saved and read back', async () => {
  const account = await makeAccount();

  await call('PUT', '/api/household', {
    cookie: account.cookie,
    body: { income: 90000, dependents: 0, hasLoan: false, incomeVaries: true },
  });

  const after = await call('GET', '/api/household', { cookie: account.cookie });

  assert.equal(after.data.household.incomeVaries, true);
});


test('a household saved without the income question still works', async () => {
  /*
    The question was added after people were already using the app, so an older
    browser tab will send a body without it. That has to keep working and mean
    "steady", rather than failing or quietly becoming true.
  */
  const account = await makeAccount();

  const saved = await call('PUT', '/api/household', {
    cookie: account.cookie,
    body: { income: 70000, dependents: 1, hasLoan: false },
  });

  assert.equal(saved.status, 200);
  assert.equal(saved.data.household.incomeVaries, false);
});


test('living costs are saved and read back', async () => {
  const account = await makeAccount();

  await call('PUT', '/api/household', {
    cookie: account.cookie,
    body: { income: 80000, dependents: 1, hasLoan: false, essentialCosts: 25000 },
  });

  const after = await call('GET', '/api/household', { cookie: account.cookie });

  assert.equal(after.data.household.essentialCosts, 25000);
});


test('living costs at or above the income are refused', async () => {
  const account = await makeAccount();

  const tooHigh = await call('PUT', '/api/household', {
    cookie: account.cookie,
    body: { income: 80000, dependents: 1, hasLoan: false, essentialCosts: 80000 },
  });

  assert.equal(tooHigh.status, 400);

  const negative = await call('PUT', '/api/household', {
    cookie: account.cookie,
    body: { income: 80000, dependents: 1, hasLoan: false, essentialCosts: -100 },
  });

  assert.equal(negative.status, 400);
});


test('a household saved without living costs still works', async () => {
  const account = await makeAccount();

  const saved = await call('PUT', '/api/household', {
    cookie: account.cookie,
    body: { income: 70000, dependents: 1, hasLoan: false },
  });

  assert.equal(saved.status, 200);
  assert.equal(saved.data.household.essentialCosts, 0);
});


test('the income question has to be a real true or false', async () => {
  const account = await makeAccount();

  const result = await call('PUT', '/api/household', {
    cookie: account.cookie,
    body: { income: 70000, dependents: 1, hasLoan: false, incomeVaries: 'yes' },
  });

  // The string "yes" is truthy in JavaScript, so accepting it would silently
  // record the opposite of a steady income for anyone with a typo in a script.
  assert.equal(result.status, 400);
});


test('a debt can be added, changed and removed', async () => {
  const account = await makeAccount();

  const added = await call('POST', '/api/debts', {
    cookie: account.cookie,
    body: { name: 'Car loan', kind: 'vehicle', principal: 300000, annualRate: 9.5, emi: 9000 },
  });

  assert.equal(added.status, 201);
  assert.equal(added.data.debt.name, 'Car loan');

  const id = added.data.debt.id;

  const changed = await call('PUT', '/api/debts/' + id, {
    cookie: account.cookie,
    body: { name: 'Car loan', kind: 'vehicle', principal: 250000, annualRate: 9.5, emi: 9000 },
  });

  assert.equal(changed.data.debt.principal, 250000);

  const removed = await call('DELETE', '/api/debts/' + id, { cookie: account.cookie });
  assert.equal(removed.status, 200);

  const list = await call('GET', '/api/debts', { cookie: account.cookie });
  assert.equal(list.data.debts.length, 0);
});


test('a debt whose EMI never clears it is refused', async () => {
  // If the monthly payment is smaller than the monthly interest, the balance
  // grows every month and the payoff date is "never".
  const account = await makeAccount();

  const result = await call('POST', '/api/debts', {
    cookie: account.cookie,
    body: { name: 'Impossible', kind: 'personal', principal: 300000, annualRate: 50, emi: 100 },
  });

  assert.equal(result.status, 400);
});


test('saving the same month twice updates it rather than adding a second', async () => {
  const account = await makeAccount();

  await call('POST', '/api/checkins', {
    cookie: account.cookie,
    body: { month: '2026-08', income: 80000, spent: 50000, saved: 20000, invested: 10000, note: 'first' },
  });

  await call('POST', '/api/checkins', {
    cookie: account.cookie,
    body: { month: '2026-08', income: 81000, spent: 50000, saved: 21000, invested: 10000, note: 'second' },
  });

  const list = await call('GET', '/api/checkins', { cookie: account.cookie });

  assert.equal(list.data.checkins.length, 1, 'there should still be only one August');
  assert.equal(list.data.checkins[0].income, 81000, 'it should hold the newer figures');
});


// ---------------------------------------------------------------
// One person cannot touch another person's data
// ---------------------------------------------------------------

test('one account cannot read, change or delete another account\'s debt', async () => {
  /*
    The most important test here. Every query in the routes filters on the user
    id from the session cookie, never on anything the browser sent, and this is
    what proves it still does.

    The bug it guards against is the common one: somebody changes a number in a
    URL and reads a stranger's finances.
  */
  const owner = await makeAccount();
  const stranger = await makeAccount();

  const added = await call('POST', '/api/debts', {
    cookie: owner.cookie,
    body: { name: 'Private loan', kind: 'personal', principal: 100000, annualRate: 12, emi: 5000 },
  });

  const id = added.data.debt.id;

  // The stranger's own list must be empty, even though a debt exists.
  const strangerList = await call('GET', '/api/debts', { cookie: stranger.cookie });
  assert.equal(strangerList.data.debts.length, 0, 'stranger should see nothing');

  // Editing it by id must fail, not quietly succeed.
  const edit = await call('PUT', '/api/debts/' + id, {
    cookie: stranger.cookie,
    body: { name: 'Stolen', kind: 'personal', principal: 1, annualRate: 1, emi: 5000 },
  });
  assert.equal(edit.status, 404, 'stranger should not be able to edit it');

  // And deleting it must fail too.
  const remove = await call('DELETE', '/api/debts/' + id, { cookie: stranger.cookie });
  assert.equal(remove.status, 404, 'stranger should not be able to delete it');

  // Finally, confirm the owner's debt is untouched by all of that.
  const ownerList = await call('GET', '/api/debts', { cookie: owner.cookie });
  assert.equal(ownerList.data.debts.length, 1);
  assert.equal(ownerList.data.debts[0].name, 'Private loan');
  assert.equal(ownerList.data.debts[0].principal, 100000);
});


// ---------------------------------------------------------------
// Forgotten passwords
// ---------------------------------------------------------------

test('the forgot form answers the same way for a real and a made-up email', async () => {
  // Otherwise the form is a way to check which addresses have accounts: send
  // ten thousand, keep the ones that answer differently.
  const account = await makeAccount();

  const real = await call('POST', '/api/auth/forgot', { body: { email: account.email } });
  const fake = await call('POST', '/api/auth/forgot', { body: { email: 'no-such-person@example.com' } });

  assert.equal(real.status, fake.status);
  assert.deepEqual(real.data, fake.data);
});


test('changing the password needs the current one', async () => {
  const account = await makeAccount();

  const wrong = await call('POST', '/api/auth/password', {
    cookie: account.cookie,
    body: { currentPassword: 'not-it', newPassword: 'a-brand-new-password' },
  });

  assert.equal(wrong.status, 401);

  // Being signed in is not enough on its own. Somebody who sits down at an
  // unlocked laptop should not be able to lock the owner out in two clicks.
  const stillWorks = await call('POST', '/api/auth/login', {
    body: { email: account.email, password: account.password },
  });

  assert.equal(stillWorks.status, 200, 'the old password should still work');
});


test('changing the password signs out other browsers but not this one', async () => {
  const account = await makeAccount();

  // Sign in a second time to stand in for another device.
  const otherDevice = await call('POST', '/api/auth/login', {
    body: { email: account.email, password: account.password },
  });

  const changed = await call('POST', '/api/auth/password', {
    cookie: account.cookie,
    body: { currentPassword: account.password, newPassword: 'a-brand-new-password' },
  });

  assert.equal(changed.status, 200);

  // The browser that made the change is handed a fresh session, so it stays in.
  const here = await call('GET', '/api/auth/me', { cookie: changed.cookie });
  assert.equal(here.status, 200, 'this browser should still be signed in');

  // The other one is out.
  const elsewhere = await call('GET', '/api/auth/me', { cookie: otherDevice.cookie });
  assert.equal(elsewhere.status, 401, 'the other device should be signed out');

  // And only the new password works from now on.
  const old = await call('POST', '/api/auth/login', {
    body: { email: account.email, password: account.password },
  });
  assert.equal(old.status, 401);

  const fresh = await call('POST', '/api/auth/login', {
    body: { email: account.email, password: 'a-brand-new-password' },
  });
  assert.equal(fresh.status, 200);
});


test('changing the password requires being signed in', async () => {
  const result = await call('POST', '/api/auth/password', {
    body: { currentPassword: 'anything', newPassword: 'a-brand-new-password' },
  });

  assert.equal(result.status, 401);
});


test('deleting an account needs the password, and takes everything with it', async () => {
  const account = await makeAccount();

  // Give the account something in every table, so the cascade has work to do.
  await call('PUT', '/api/household', {
    cookie: account.cookie,
    body: { income: 80000, dependents: 1, hasLoan: true },
  });
  await call('POST', '/api/debts', {
    cookie: account.cookie,
    body: { name: 'Car', kind: 'vehicle', principal: 200000, annualRate: 9, emi: 8000 },
  });
  await call('POST', '/api/goals', {
    cookie: account.cookie,
    body: { name: 'Fund', targetAmount: 100000, savedAmount: 0, targetDate: '2028-01-01' },
  });

  // The wrong password must not delete anything.
  const wrong = await call('DELETE', '/api/auth/account', {
    cookie: account.cookie,
    body: { password: 'not-my-password' },
  });

  assert.equal(wrong.status, 401);

  const stillThere = await call('GET', '/api/debts', { cookie: account.cookie });
  assert.equal(stillThere.data.debts.length, 1, 'nothing should have been deleted');

  // The right one does.
  const gone = await call('DELETE', '/api/auth/account', {
    cookie: account.cookie,
    body: { password: account.password },
  });

  assert.equal(gone.status, 200);

  // The session died with the account.
  const me = await call('GET', '/api/auth/me', { cookie: account.cookie });
  assert.equal(me.status, 401);

  // And the password no longer signs in, because there is nothing to sign in to.
  const login = await call('POST', '/api/auth/login', {
    body: { email: account.email, password: account.password },
  });
  assert.equal(login.status, 401);
});


test('the email of a deleted account can be used again', async () => {
  /*
    Proves the row really went, rather than being hidden or flagged. If anything
    were left behind, signing up with the same address would come back 409.
  */
  const account = await makeAccount();

  await call('DELETE', '/api/auth/account', {
    cookie: account.cookie,
    body: { password: account.password },
  });

  const again = await call('POST', '/api/auth/signup', {
    body: { name: 'Someone Else', email: account.email, password: 'a-different-password' },
  });

  assert.equal(again.status, 201);
});


test('deleting an account requires being signed in', async () => {
  const result = await call('DELETE', '/api/auth/account', { body: { password: 'anything' } });
  assert.equal(result.status, 401);
});


test('a made-up reset token is refused', async () => {
  const result = await call('POST', '/api/auth/reset', {
    body: { token: '1.completely-invented-token', password: 'brandnewpassword' },
  });

  assert.equal(result.status, 400);
});
