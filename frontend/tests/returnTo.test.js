import { test } from 'vitest';
import assert from 'node:assert/strict';
import { loginPathFor, pathAfterLogin } from '../src/lib/returnTo.js';

// Pretends the browser is on this address, then asks where login should go.
function afterLoginFrom(address) {
  window.history.pushState({}, '', address);
  return pathAfterLogin('/dashboard');
}

test('login brings you back to the page you asked for', () => {
  assert.equal(loginPathFor('/goals?tab=open'), '/login?next=%2Fgoals%3Ftab%3Dopen');
  assert.equal(afterLoginFrom('/login?next=%2Fgoals%3Ftab%3Dopen'), '/goals?tab=open');
});

test('with no page remembered, login goes to the dashboard', () => {
  assert.equal(afterLoginFrom('/login'), '/dashboard');
});

test('login never sends you to another website', () => {
  // "//evil.com" is read by the browser as a different site.
  assert.equal(afterLoginFrom('/login?next=%2F%2Fevil.com'), '/dashboard');
  assert.equal(afterLoginFrom('/login?next=https%3A%2F%2Fevil.com'), '/dashboard');
  assert.equal(afterLoginFrom('/login?next=%2Flogin'), '/dashboard');
});
