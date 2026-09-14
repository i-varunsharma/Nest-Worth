/*
  Checks for account fields: name, email, password, phone and one-time code.

  Each function returns an error message, or an empty string when the value is
  fine. The browser runs its own copy of these to be helpful; these are the ones
  that decide, because anyone can post to the API directly.
*/

const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 80;
const MAX_EMAIL_LENGTH = 255;
const MIN_PASSWORD_LENGTH = 8;

// bcrypt only reads the first 72 bytes, so a longer password is no stronger.
const MAX_PASSWORD_LENGTH = 72;

const PHONE_DIGITS = 10;
const OTP_DIGITS = 6;


export function checkName(name) {
  if (typeof name !== 'string') {
    return 'Name is missing.';
  }
  if (name.trim().length < MIN_NAME_LENGTH) {
    return 'Please enter your name.';
  }
  if (name.trim().length > MAX_NAME_LENGTH) {
    return 'That name is too long.';
  }
  return '';
}


export function checkEmail(email) {
  if (typeof email !== 'string') {
    return 'Email is missing.';
  }

  const trimmed = email.trim();

  if (trimmed.length === 0) {
    return 'Please enter your email address.';
  }
  if (trimmed.length > MAX_EMAIL_LENGTH) {
    return 'That email address is too long.';
  }

  const parts = trimmed.split('@');

  if (parts.length !== 2 || parts[0].length === 0) {
    return 'That does not look like an email address.';
  }
  if (!parts[1].includes('.') || parts[1].endsWith('.')) {
    return 'That does not look like an email address.';
  }

  return '';
}


export function checkPassword(password) {
  if (typeof password !== 'string') {
    return 'Password is missing.';
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return 'Use at least ' + MIN_PASSWORD_LENGTH + ' characters.';
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return 'That password is too long. Use ' + MAX_PASSWORD_LENGTH + ' characters or fewer.';
  }
  return '';
}


/* "+91 98765-43210" becomes "919876543210". */
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

  if (digits.length === 0) {
    return 'Please enter your mobile number.';
  }
  if (digits.length !== PHONE_DIGITS) {
    return 'An Indian mobile number has 10 digits.';
  }
  if (digits[0] < '6') {
    return 'Indian mobile numbers start with 6, 7, 8 or 9.';
  }
  return '';
}


export function checkOtp(code) {
  const digits = keepOnlyDigits(code);

  if (digits.length === 0) {
    return 'Enter the code we sent you.';
  }
  if (digits.length !== OTP_DIGITS) {
    return 'The code is 6 digits long.';
  }
  return '';
}
