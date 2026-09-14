/*
  Form checks the browser runs before sending anything. Each returns an error
  message, or '' when the value is fine. The server runs its own checks; these
  only save a round trip.
*/


// One @ with something on each side. Stricter checks reject real addresses.
export function checkEmail(email) {
  const trimmed = email.trim();

  if (trimmed === '') {
    return 'Please enter your email address.';
  }

  const parts = trimmed.split('@');

  if (parts.length !== 2) {
    return 'That does not look like an email address.';
  }

  const beforeTheAt = parts[0];
  const afterTheAt = parts[1];

  if (beforeTheAt === '') {
    return 'That does not look like an email address.';
  }

  // The part after the @ needs a dot with something after it, as in "gmail.com".
  if (afterTheAt.includes('.') === false) {
    return 'That does not look like an email address.';
  }

  if (afterTheAt.endsWith('.') === true) {
    return 'That does not look like an email address.';
  }

  return '';
}


// isNew is true on signup, where a decent password is required. At login only
// presence is checked, since an old password cannot be changed from that screen.
export function checkPassword(password, isNew) {
  if (password === '') {
    return 'Please enter your password.';
  }

  if (isNew === true && password.length < 8) {
    return 'Use at least 8 characters.';
  }

  return '';
}


// Only that something real was typed: names take every shape.
export function checkName(name) {
  if (name.trim() === '') {
    return 'Please enter your name.';
  }

  if (name.trim().length < 2) {
    return 'That name looks a little short.';
  }

  return '';
}


// "+91-98765 43210" becomes digits only, so one rule covers every way of typing it.
export function keepOnlyDigits(text) {
  let digits = '';

  for (const character of text) {
    if (character >= '0' && character <= '9') {
      digits = digits + character;
    }
  }

  return digits;
}


// Indian mobile numbers are 10 digits and start with 6, 7, 8 or 9.
export function checkPhone(phone) {
  const digits = keepOnlyDigits(phone);

  if (digits === '') {
    return 'Please enter your mobile number.';
  }

  if (digits.length < 10) {
    return 'An Indian mobile number has 10 digits.';
  }

  if (digits.length > 10) {
    return 'That is more than 10 digits. Leave out the +91.';
  }

  const firstDigit = digits[0];
  if (firstDigit < '6') {
    return 'Indian mobile numbers start with 6, 7, 8 or 9.';
  }

  return '';
}


// Only the shape of the code. Whether it is correct is decided by the server.
export function checkOtp(code) {
  const digits = keepOnlyDigits(code);

  if (digits === '') {
    return 'Enter the code we sent you.';
  }

  if (digits.length !== 6) {
    return 'The code is 6 digits long.';
  }

  return '';
}
