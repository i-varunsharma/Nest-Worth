/*
  Rules for account fields: name, email, password, phone number and one-time code.

  Used in two places:
    frontend  lib/validation.js re-exports these, so a form can show the
              message straight away without waiting for the server
    backend   validation/accountFields.js re-exports these, and the server's
              check is the one that decides, because anyone can skip the form
              and call the API directly with curl

  Before, each side had its own copy and the copies had drifted (different
  messages, different limits). Now a rule changed here changes on both sides.

  Each function returns an error message, or '' when the value is fine. Every
  check first makes sure the value is text, because a request body can contain
  anything (a number, null, an object).
*/

const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 80;
const MAX_EMAIL_LENGTH = 255;
export const MIN_PASSWORD_LENGTH = 8;

// bcrypt only reads the first 72 bytes, so a longer password is no stronger.
export const MAX_PASSWORD_LENGTH = 72;

const PHONE_DIGITS = 10;
const OTP_DIGITS = 6;

const NOT_AN_EMAIL = 'That does not look like an email address.';


export function checkName(name) {
  if (typeof name !== 'string' || name.trim() === '') {
    return 'Please enter your name.';
  }
  if (name.trim().length < MIN_NAME_LENGTH) {
    return 'That name looks a little short.';
  }
  if (name.trim().length > MAX_NAME_LENGTH) {
    return 'That name is too long.';
  }
  return '';
}


// One @ with something on each side, and a dot after the @ as in "gmail.com".
// Stricter checks end up rejecting real addresses.
export function checkEmail(email) {
  if (typeof email !== 'string' || email.trim() === '') {
    return 'Please enter your email address.';
  }

  const trimmed = email.trim();

  if (trimmed.length > MAX_EMAIL_LENGTH) {
    return 'That email address is too long.';
  }

  const parts = trimmed.split('@');

  if (parts.length !== 2) {
    return NOT_AN_EMAIL;
  }

  const beforeTheAt = parts[0];
  const afterTheAt = parts[1];

  if (beforeTheAt === '') {
    return NOT_AN_EMAIL;
  }
  if (afterTheAt.includes('.') === false) {
    return NOT_AN_EMAIL;
  }
  if (afterTheAt.endsWith('.') === true) {
    return NOT_AN_EMAIL;
  }

  return '';
}


// For a new password: signup, reset and change password.
export function checkPassword(password) {
  if (typeof password !== 'string' || password === '') {
    return 'Please enter a password.';
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return 'Use at least ' + MIN_PASSWORD_LENGTH + ' characters.';
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return 'That password is too long. Use ' + MAX_PASSWORD_LENGTH + ' characters or fewer.';
  }
  return '';
}


// For the login form. Only checks something was typed: telling somebody their
// existing password is too short helps nobody, and the server decides if it is right.
export function checkPasswordEntered(password) {
  if (typeof password !== 'string' || password === '') {
    return 'Please enter your password.';
  }
  return '';
}


/* "+91 98765-43210" becomes "919876543210", so one rule covers every way of typing it. */
export function keepOnlyDigits(text) {
  if (typeof text !== 'string') {
    return '';
  }

  let digits = '';

  for (const character of text) {
    if (character >= '0' && character <= '9') {
      digits = digits + character;
    }
  }

  return digits;
}


/* Indian mobile numbers are 10 digits and start with 6, 7, 8 or 9. */
export function checkPhone(phone) {
  const digits = keepOnlyDigits(phone);

  if (digits === '') {
    return 'Please enter your mobile number.';
  }
  if (digits.length < PHONE_DIGITS) {
    return 'An Indian mobile number has 10 digits.';
  }
  if (digits.length > PHONE_DIGITS) {
    return 'That is more than 10 digits. Leave out the +91.';
  }
  if (digits[0] < '6') {
    return 'Indian mobile numbers start with 6, 7, 8 or 9.';
  }
  return '';
}


// Only the shape of the code. Whether it is the right code is decided by the server.
export function checkOtp(code) {
  const digits = keepOnlyDigits(code);

  if (digits === '') {
    return 'Enter the code we sent you.';
  }
  if (digits.length !== OTP_DIGITS) {
    return 'The code is 6 digits long.';
  }
  return '';
}
