import test from 'node:test';
import assert from 'node:assert/strict';
import { rateLimit } from '../src/lib/rateLimit.js';

/*
  Tests for the limiter that stops somebody guessing passwords all night.

  Express middleware is only a function taking (req, res, next), and it does not
  care whether those came from a real request or from us. So we hand it pretend
  ones: a request that is just an address, and a response that writes down what
  it was told instead of sending it anywhere.
*/


/* A pretend request from one IP address. */
function fakeRequest(ip) {
  return { ip: ip, user: null };
}


/*
  A pretend response. Records what it was given so a test can check it.

  Each method returns the object itself, because Express allows
  res.status(429).json(...) to be chained and ours has to do the same.
*/
function fakeResponse() {
  return {
    statusCode: null,
    body: null,
    headers: {},

    status(code) {
      this.statusCode = code;
      return this;
    },

    json(data) {
      this.body = data;
      return this;
    },

    set(name, value) {
      this.headers[name] = value;
      return this;
    },
  };
}


/*
  Sends one request through the limiter and reports whether it was allowed.

  Middleware calls next() to mean "carry on", so if next ran the request was
  allowed.
*/
function sendOne(limiter, req) {
  const res = fakeResponse();

  let wasAllowed = false;
  const next = () => {
    wasAllowed = true;
  };

  limiter(req, res, next);

  return { wasAllowed, res };
}


test('allows requests up to the limit, then refuses', () => {
  const limiter = rateLimit({ limit: 3, windowMs: 60000 });
  const req = fakeRequest('1.2.3.4');

  // The first three are inside the allowance.
  assert.equal(sendOne(limiter, req).wasAllowed, true, 'first should be allowed');
  assert.equal(sendOne(limiter, req).wasAllowed, true, 'second should be allowed');
  assert.equal(sendOne(limiter, req).wasAllowed, true, 'third should be allowed');

  // The fourth is one too many.
  const fourth = sendOne(limiter, req);
  assert.equal(fourth.wasAllowed, false, 'fourth should be refused');

  // 429 means exactly "too many requests". 400 or 403 would misdescribe it.
  assert.equal(fourth.res.statusCode, 429);
});


test('a refusal explains itself and says how long to wait', () => {
  const limiter = rateLimit({ limit: 1, windowMs: 60000, message: 'Slow down.' });
  const req = fakeRequest('1.2.3.4');

  sendOne(limiter, req);
  const refused = sendOne(limiter, req);

  assert.equal(refused.res.body.error, 'Slow down.');

  // So the interface can say when to come back, rather than leaving somebody
  // pressing a dead button.
  assert.ok(refused.res.body.retryAfterSeconds > 0);

  // Retry-After is the standard header for the same information.
  assert.ok(refused.res.headers['Retry-After']);
});


test('counts each caller separately', () => {
  // A limiter that counted everybody together would pass every other test here
  // and then, the moment two people used the site at once, lock out the second
  // because of what the first had done.
  const limiter = rateLimit({ limit: 2, windowMs: 60000 });

  const first = fakeRequest('1.1.1.1');
  const second = fakeRequest('2.2.2.2');

  // Use up the first caller's whole allowance.
  sendOne(limiter, first);
  sendOne(limiter, first);
  assert.equal(sendOne(limiter, first).wasAllowed, false, 'first caller is now over');

  // The second caller has not asked for anything yet and must be unaffected.
  assert.equal(sendOne(limiter, second).wasAllowed, true, 'second caller should be fine');
});


test('counts a signed-in person by their account, not their address', () => {
  // Two people on the same office wifi share one IP address. Counting by
  // account, when we know it, means one cannot lock out the other.
  const limiter = rateLimit({ limit: 1, windowMs: 60000 });

  const sameIp = '3.3.3.3';
  const alice = { ip: sameIp, user: { id: 1 } };
  const bob = { ip: sameIp, user: { id: 2 } };

  assert.equal(sendOne(limiter, alice).wasAllowed, true);
  assert.equal(sendOne(limiter, alice).wasAllowed, false, 'alice has used her one');

  // Same address, different account, so Bob still has his own allowance.
  assert.equal(sendOne(limiter, bob).wasAllowed, true, 'bob should be unaffected');
});


test('the allowance comes back once the window has passed', () => {
  // A one millisecond window, so the test does not have to sit and wait.
  const limiter = rateLimit({ limit: 1, windowMs: 1 });
  const req = fakeRequest('4.4.4.4');

  assert.equal(sendOne(limiter, req).wasAllowed, true);
  assert.equal(sendOne(limiter, req).wasAllowed, false, 'refused inside the window');

  // Wait for the window to run out, then try again.
  return new Promise((resolve) => {
    setTimeout(() => {
      assert.equal(sendOne(limiter, req).wasAllowed, true, 'allowed again afterwards');
      resolve();
    }, 20);
  });
});
