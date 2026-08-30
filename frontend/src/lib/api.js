/*
  api.js
  ------
  Every conversation with the backend goes through this one file.

  Keeping it in one place means the pages stay readable: a page says
  "api.login(email, password)" and never has to think about URLs, headers or
  cookies. It also means that when something about the API changes, there is
  exactly one file to edit.

  Two details matter here and nowhere else:

    credentials: 'include'
      Tells the browser to send our session cookie with the request. Without it
      the browser talks to the API perfectly happily but leaves the cookie
      behind, and every request looks like it came from a stranger. It has to be
      matched by credentials: true in the server's CORS settings.

    Content-Type: application/json
      Tells the server the body is JSON, so express.json() knows to read it.
*/

// Where the backend lives. In development it is a different port from the
// React app, which is why CORS has to be set up at all. Change this by putting
// VITE_API_URL in frontend/.env.local when you deploy.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';


/*
  Sends one request and always gives back the same shape:

    { ok: true,  data:  { ... } }
    { ok: false, error: 'a sentence to show the person', field: 'email' }

  Returning a result rather than throwing an error is a deliberate choice. It
  means pages can write a plain "if (result.ok)" instead of wrapping every call
  in try / catch, which keeps them much easier to follow.

  "field" is optional. When the server knows which input caused the problem it
  says so, and the page can put the message under that exact box.
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

    // response.ok is true for status codes 200 to 299. Anything else is the
    // server telling us it refused, and it will have said why.
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
    // We only land here when the request never arrived: the server is not
    // running, the internet is off, or the address is wrong. A network failure
    // deserves a different message from a rejection.
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

/* Asks the server who is signed in. Used by every protected page on load. */
export function me() {
  return request('/api/auth/me', 'GET');
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

/*
  "credential" is the token Google's own sign-in window hands us. We pass it
  straight to our server, which checks with Google before believing any of it.
*/
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
  });
}

export function saveName(name) {
  return request('/api/household/name', 'PUT', { name });
}


// ---------------------------------------------------------------
// Debts, goals, assets and check-ins
//
// These four all follow the same shape, which is not an accident. It is the
// usual pattern for a list of things belonging to one person:
//
//     GET     read them all
//     POST    add one
//     PUT     change one, named by its id
//     DELETE  remove one, named by its id
//
// Once you can read one of these four, you can read all of them, and the same
// pattern turns up in almost every app you will ever work on.
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
