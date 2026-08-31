/*
  Every request to the backend goes through this file, so pages can say
  api.login(email, password) without thinking about URLs, headers or cookies.

  Two details matter here and nowhere else:

    credentials: 'include'
      Sends our session cookie with the request. Without it the browser talks to
      the API happily but leaves the cookie behind, so every request looks like
      it came from a stranger. The server's CORS settings have to match it with
      credentials: true.

    Content-Type: application/json
      Tells the server the body is JSON, so express.json() reads it.
*/

// Where the backend lives. A different port from the React app in development,
// which is why CORS has to be set up. Set VITE_API_URL when you deploy.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';


/*
  Sends one request and always returns the same shape:

    { ok: true,  data:  { ... } }
    { ok: false, error: 'a sentence to show the person', field: 'email' }

  Returning a result rather than throwing means pages write a plain
  if (result.ok) instead of wrapping every call in try / catch.

  "field" is optional. When the server knows which input caused the problem, the
  page can put the message under that box.
*/
async function request(path, method, body) {
  try {
    const options = {
      method: method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    };

    // GET requests are not allowed to have a body.
    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(API_URL + path, options);
    const data = await response.json();

    // response.ok covers 200 to 299. Anything else is a refusal, and the
    // server will have said why.
    if (!response.ok) {
      return {
        ok: false,
        error: data.error || 'Something went wrong. Please try again.',
        field: data.field,
        status: response.status,
      };
    }

    return { ok: true, data: data };
  } catch {
    // Only reached when the request never arrived: the server is not running,
    // the internet is off, or the address is wrong. That deserves a different
    // message from a refusal.
    return {
      ok: false,
      error: 'Cannot reach the server. Is the backend running on port 4000?',
    };
  }
}


// ---------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------

export function signup(name, email, password) {
  return request('/api/auth/signup', 'POST', { name, email, password });
}

export function login(email, password) {
  return request('/api/auth/login', 'POST', { email, password });
}

export function logout() {
  return request('/api/auth/logout', 'POST');
}

/* Who is signed in? Called by every protected page when it loads. */
export function me() {
  return request('/api/auth/me', 'GET');
}


// ---------------------------------------------------------------
// Forgotten passwords
// ---------------------------------------------------------------

/*
  Step one: ask for a reset link.

  This reports success even for an email with no account. If it answered
  differently for an address it recognised, the form could be used to find out
  who has an account here.
*/
export function forgotPassword(email) {
  return request('/api/auth/forgot', 'POST', { email });
}

/*
  Step two: send back the token from the link, with the new password.

  A success also signs them in, since reading the account's email is the same
  proof a password gives.
*/
export function resetPassword(token, password) {
  return request('/api/auth/reset', 'POST', { token, password });
}


/*
  Changing the password from the settings page, while signed in.

  currentPassword is ignored by the server for an account that has never had a
  password, which is the case for anyone who only ever used Google or a phone
  code. Those people are setting one for the first time.
*/
export function changePassword(currentPassword, newPassword) {
  return request('/api/auth/password', 'POST', { currentPassword, newPassword });
}


/*
  Closing the account for good.

  The server needs the password when the account has one, and the word DELETE
  typed out when it does not, because an account created with Google or a phone
  code has no password to check against.

  Everything goes with it: the household, debts, goals, assets and check-ins.
  The database does that part itself through ON DELETE CASCADE.
*/
export function deleteAccount(password, confirmText) {
  return request('/api/auth/account', 'DELETE', { password, confirmText });
}


// ---------------------------------------------------------------
// Signing in with a phone number
// ---------------------------------------------------------------

export function sendOtp(phone) {
  return request('/api/auth/otp/send', 'POST', { phone });
}

export function verifyOtp(phone, code) {
  return request('/api/auth/otp/verify', 'POST', { phone, code });
}


// ---------------------------------------------------------------
// Signing in with Google
// ---------------------------------------------------------------

// "credential" is the token Google's sign-in window gives us. It goes straight
// to our server, which checks it with Google before believing any of it.
export function google(credential) {
  return request('/api/auth/google', 'POST', { credential });
}


// ---------------------------------------------------------------
// The household
// ---------------------------------------------------------------

export function getHousehold() {
  return request('/api/household', 'GET');
}

export function saveHousehold(household) {
  return request('/api/household', 'PUT', {
    income: household.income,
    dependents: household.dependents,
    hasLoan: household.hasLoan,
    incomeVaries: household.incomeVaries,
    essentialCosts: household.essentialCosts,
  });
}

export function saveName(name) {
  return request('/api/household/name', 'PUT', { name });
}


// ---------------------------------------------------------------
// Debts, goals, assets and check-ins
//
// All four follow the same shape, the usual pattern for a list of things
// belonging to one person:
//
//     GET     read them all
//     POST    add one
//     PUT     change one, named by its id
//     DELETE  remove one, named by its id
// ---------------------------------------------------------------

export function getDebts() {
  return request('/api/debts', 'GET');
}

export function addDebt(debt) {
  return request('/api/debts', 'POST', debt);
}

export function updateDebt(id, debt) {
  return request('/api/debts/' + id, 'PUT', debt);
}

export function deleteDebt(id) {
  return request('/api/debts/' + id, 'DELETE');
}


export function getGoals() {
  return request('/api/goals', 'GET');
}

export function addGoal(goal) {
  return request('/api/goals', 'POST', goal);
}

export function updateGoal(id, goal) {
  return request('/api/goals/' + id, 'PUT', goal);
}

export function deleteGoal(id) {
  return request('/api/goals/' + id, 'DELETE');
}


export function getAssets() {
  return request('/api/assets', 'GET');
}

export function addAsset(asset) {
  return request('/api/assets', 'POST', asset);
}

export function updateAsset(id, asset) {
  return request('/api/assets/' + id, 'PUT', asset);
}

export function deleteAsset(id) {
  return request('/api/assets/' + id, 'DELETE');
}


export function getCheckins() {
  return request('/api/checkins', 'GET');
}

/* Saving a month that already exists updates it rather than adding a second. */
export function saveCheckin(checkin) {
  return request('/api/checkins', 'POST', checkin);
}
