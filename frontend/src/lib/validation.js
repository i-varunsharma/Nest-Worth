/*
  Small checks that the login and signup forms need.

  Each function returns an error message when something is wrong, or an empty
  string when everything is fine. An empty string counts as "falsy" in
  JavaScript, which means you can write:

      if (error) { ... }

  and it only runs when there really is a message.

  Keeping these here, away from the pages, means the same rule is used in every
  place that needs it, and you only have to fix a rule once.
*/


/*
  Checks an email address.

  We are deliberately not clever here. A full email check is famously hard to get
  right, and being too strict rejects addresses that actually work. Making sure
  there is one @ with something on either side catches nearly every typo.
*/
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


/*
  Checks a password.

  "isNew" is true on the signup page, where we ask for a decent password, and
  false on the login page, where we only check that something was typed. Telling
  someone signing in that their old password is too short would be useless, since
  they cannot change it from that screen anyway.
*/
export function checkPassword(password, isNew) {
  if (password === '') {
    return 'Please enter your password.';
  }

  if (isNew === true && password.length < 8) {
    return 'Use at least 8 characters.';
  }

  return '';
}


/*
  Checks a person's name. We only ask that they typed something real, because
  names around the world take every shape imaginable.
*/
export function checkName(name) {
  if (name.trim() === '') {
    return 'Please enter your name.';
  }

  if (name.trim().length < 2) {
    return 'That name looks a little short.';
  }

  return '';
}


/*
  Removes everything that is not a digit.

  People type phone numbers in all sorts of ways: "98765 43210", "+91-9876543210",
  "(98765) 43210". Stripping everything else first means we only have to write
  one rule instead of one rule per style.
*/
export function keepOnlyDigits(text) {
  let digits = '';

  for (const character of text) {
    if (character >= '0' && character <= '9') {
      digits = digits + character;
    }
  }

  return digits;
}


/*
  Checks an Indian mobile number.

  Indian mobile numbers are 10 digits long and always start with 6, 7, 8 or 9,
  so those two rules catch almost every mistyped number.
*/
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


/*
  Checks the one-time code from the text message.

  Six digits is what almost every provider sends. This only checks the shape of
  what was typed. Whether the code is actually CORRECT is decided by the server,
  never here, because anything running in the browser can be edited by the person
  using it.
*/
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
