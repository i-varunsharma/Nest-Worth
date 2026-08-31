import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkEmail,
  checkHousehold,
  checkName,
  checkOtp,
  checkPassword,
  checkPhone,
  keepOnlyDigits,
} from '../src/lib/validate.js';

/*
  Tests for the server's form checks. Run with: npm test

  assert.equal(a, b) fails and prints both if a is not b. That is all any of
  these do.

  Watch the direction of the answers: these functions return an error message
  when something is wrong and an empty string when it is fine, so an empty
  string means the input was accepted.
*/


// ---------------------------------------------------------------
// Names
// ---------------------------------------------------------------

test('checkName accepts an ordinary name', () => {
  assert.equal(checkName('Varun Sharma'), '');
});

test('checkName rejects a name that is only spaces', () => {
  // Trimming has to happen before the length is measured, or a string of
  // spaces passes as a valid name.
  assert.notEqual(checkName('    '), '');
});

test('checkName rejects a missing name', () => {
  assert.notEqual(checkName(undefined), '');
});


// ---------------------------------------------------------------
// Emails
// ---------------------------------------------------------------

test('checkEmail accepts an ordinary address', () => {
  assert.equal(checkEmail('varun@example.com'), '');
});

test('checkEmail rejects an address with no @', () => {
  assert.notEqual(checkEmail('varun.example.com'), '');
});

test('checkEmail rejects an address with nothing before the @', () => {
  assert.notEqual(checkEmail('@example.com'), '');
});

test('checkEmail rejects a domain with no dot in it', () => {
  assert.notEqual(checkEmail('varun@example'), '');
});

test('checkEmail rejects anything that is not text', () => {
  // Anyone can post a number, or nothing at all, straight at the API. Every
  // check has to survive that, not just a typo in a form.
  assert.notEqual(checkEmail(12345), '');
  assert.notEqual(checkEmail(null), '');
});


// ---------------------------------------------------------------
// Passwords
// ---------------------------------------------------------------

test('checkPassword accepts eight characters', () => {
  assert.equal(checkPassword('password'), '');
});

test('checkPassword rejects seven characters', () => {
  assert.notEqual(checkPassword('passwor'), '');
});

test('checkPassword rejects a password longer than 72 characters', () => {
  // bcrypt reads only the first 72 bytes and ignores the rest, so a 200
  // character password is no stronger than its first 72 while feeling much
  // stronger to whoever chose it. Refusing is more honest than trimming.
  const tooLong = 'a'.repeat(73);
  assert.notEqual(checkPassword(tooLong), '');

  const justFits = 'a'.repeat(72);
  assert.equal(checkPassword(justFits), '');
});


// ---------------------------------------------------------------
// Phone numbers
// ---------------------------------------------------------------

test('keepOnlyDigits strips everything that is not a number', () => {
  assert.equal(keepOnlyDigits('+91 98765-43210'), '919876543210');
  assert.equal(keepOnlyDigits('(98765) 43210'), '9876543210');
  assert.equal(keepOnlyDigits('no digits here'), '');
});

test('checkPhone accepts a ten digit Indian mobile number', () => {
  assert.equal(checkPhone('9876543210'), '');
});

test('checkPhone accepts the same number typed untidily', () => {
  // Why keepOnlyDigits exists. People type phone numbers every way imaginable
  // and none of them should be an error message.
  assert.equal(checkPhone('98765 43210'), '');
});

test('checkPhone rejects the wrong number of digits', () => {
  assert.notEqual(checkPhone('98765'), '');
  assert.notEqual(checkPhone('98765432101'), '');
});

test('checkPhone rejects a number starting below 6', () => {
  // Indian mobile numbers begin with 6, 7, 8 or 9. A leading 1 means no text
  // message will arrive.
  assert.notEqual(checkPhone('1234567890'), '');
});


// ---------------------------------------------------------------
// One time codes
// ---------------------------------------------------------------

test('checkOtp accepts six digits, including leading zeros', () => {
  assert.equal(checkOtp('123456'), '');

  // Codes are text, not numbers, so this case works. As a number 000123 would
  // become 123 and stop matching what was sent.
  assert.equal(checkOtp('000123'), '');
});

test('checkOtp rejects a code of the wrong length', () => {
  assert.notEqual(checkOtp('12345'), '');
  assert.notEqual(checkOtp('1234567'), '');
});


// ---------------------------------------------------------------
// The household answers
// ---------------------------------------------------------------

test('checkHousehold accepts sensible answers', () => {
  assert.equal(checkHousehold({ income: 62000, dependents: 2, hasLoan: true }), '');
});

test('checkHousehold accepts numbers that arrived as text', () => {
  // Anything sent over the network can arrive as text, so "62000" has to be
  // treated the same as 62000.
  assert.equal(checkHousehold({ income: '62000', dependents: '2', hasLoan: false }), '');
});

test('checkHousehold rejects a negative or absurd income', () => {
  assert.notEqual(checkHousehold({ income: -5, dependents: 1, hasLoan: false }), '');
  assert.notEqual(checkHousehold({ income: 999999999999, dependents: 1, hasLoan: false }), '');
});

test('checkHousehold rejects a missing loan answer', () => {
  // hasLoan has to be a real true or false. Leaving it out must not become
  // "no" by accident.
  assert.notEqual(checkHousehold({ income: 62000, dependents: 2 }), '');
});
