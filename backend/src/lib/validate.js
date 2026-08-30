/*
  validate.js
  -----------
  The server's own copy of the form checks.

  The browser already checks these before sending anything, so why check again?
  Because the browser is not in charge. Anyone can send a request straight to
  this API with curl or Postman and skip the form entirely. Checks in the
  browser are there to be helpful. Checks here are there to be true.

  This is worth remembering as a rule: validate for the user in the client,
  validate for the database on the server.

  Each function returns an error message, or an empty string when all is well.
*/


export function checkName(name) {
  if (typeof name !== 'string') {
    return 'Name is missing.';
  }
  if (name.trim().length < 2) {
    return 'Please enter your name.';
  }
  if (name.trim().length > 80) {
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
  if (trimmed.length > 255) {
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
  if (password.length < 8) {
    return 'Use at least 8 characters.';
  }

  // bcrypt only looks at the first 72 bytes of a password, so anything longer
  // gives a false sense of security. We refuse it rather than silently trim.
  if (password.length > 72) {
    return 'That password is too long. Use 72 characters or fewer.';
  }

  return '';
}


/* Strips everything that is not a digit, so "+91 98765-43210" becomes digits. */
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
  if (digits.length !== 10) {
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
  if (digits.length !== 6) {
    return 'The code is 6 digits long.';
  }

  return '';
}


/*
  Checks the three household answers.
  Numbers arriving over the network are often text, so convert first and check
  the result really is a number.
*/
export function checkHousehold(body) {
  const income = Number(body.income);
  const dependents = Number(body.dependents);

  if (!Number.isFinite(income) || income < 1000 || income > 100000000) {
    return 'That income does not look right.';
  }
  if (!Number.isInteger(dependents) || dependents < 0 || dependents > 20) {
    return 'That number of dependents does not look right.';
  }
  if (typeof body.hasLoan !== 'boolean') {
    return 'The loan answer is missing.';
  }

  return '';
}
