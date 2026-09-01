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
/*
  What to do when a session ends in the middle of using the app.

  RequireAuth checks who is signed in when a page loads, so a session that had
  already ended never gets that far. The gap is one that ends WHILE the page is
  open: a tab left overnight, or the API restarted underneath you. The next
  thing you click comes back 401, and without this the page showed "Please sign
  in first" as a dead end with no way to reach the login screen.

  It reacts to the server's "no_session" code rather than to the 401 on its own,
  and that distinction matters. A wrong password and a wrong one-time code are
  also 401s, and sending somebody to the login screen because they mistyped a
  code on the signup page would be worse than the problem being fixed.

  It is a full page load rather than a router navigation on purpose. Whatever
  state the page was holding belongs to a session that no longer exists.

  The check for where we already are stops a loop.
*/
function goToLoginAfterSessionEnded() {
  const alreadyThere = window.location.pathname === '/login';

  if (alreadyThere === false) {
    window.location.href = '/login';
  }
}


/*
  The main helper. isAuthCheck marks the one call that is ALLOWED to be told
  there is no session without it meaning anything went wrong: me(), whose whole
  job is asking whether anybody is signed in.
*/
async function request(path, method, body, isAuthCheck) {
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
      if (data.code === 'no_session' && isAuthCheck !== true) {
        goToLoginAfterSessionEnded();
      }

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
  // The true marks this as the auth check, so a 401 here means "nobody is
  // signed in" rather than "your session just ended". See request() above.
  return request('/api/auth/me', 'GET', undefined, true);
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


// ---------------------------------------------------------------
// Insights
// ---------------------------------------------------------------

/*
  The reporting endpoint.

  Everything it returns is worked out by the database rather than here:
  averages, running totals, the best and worst month, and what is owed and
  owned grouped by kind. This page used to add those up itself after fetching
  every row, which meant sending two years of check-ins across the network so
  that JavaScript could throw nearly all of it away.
*/
export function getInsights() {
  return request('/api/insights', 'GET');
}


/*
  The different ways this person could use the same money, each played out
  fifteen years by the simulation in shared/scenarios.js.

  Every figure comes from the server. The browser only draws it, which is why
  the charts and the AI coach can never disagree about where a choice lands.
*/
export function getScenarios() {
  return request('/api/scenarios', 'GET');
}


export function getCheckins() {
  return request('/api/checkins', 'GET');
}

/* Saving a month that already exists updates it rather than adding a second. */
export function saveCheckin(checkin) {
  return request('/api/checkins', 'POST', checkin);
}


// ---------------------------------------------------------------
// The AI coach
// ---------------------------------------------------------------

/*
  Asks Claude about the signed-in person's own money, and reads the answer as
  it is written rather than waiting for the whole thing.

  This is the only call in this file that does not use request() above, because
  it is the only one that does not get a single JSON object back. The server
  holds the connection open and sends pieces along it, so this has to read them
  as they land.

    question  what to ask. Empty means "what should I do next".
    history   earlier turns, as [{ role, text }]. The browser keeps the
              conversation; the server keeps nothing between questions.
    onEvent   called for each piece:
                { type: 'text',  text }   more of the answer
                { type: 'tool',  label }  a calculation started running
                { type: 'error', error }  something went wrong
                { type: 'done' }          finished

  Nothing about the money is sent. The server reads that out of the database
  itself, which is both safer and less to send.
*/
export async function askCoach(question, history, onEvent) {
  let response;

  try {
    response = await fetch(API_URL + '/api/advice', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: question, history: history }),
    });
  } catch {
    onEvent({ type: 'error', error: 'Cannot reach the server. Is the backend running on port 4000?' });
    return;
  }

  /*
    A refusal arrives as ordinary JSON with a 4xx status, before any streaming
    starts. Only once the status is 200 is the body a stream.
  */
  if (!response.ok) {
    let message = 'Something went wrong. Please try again.';

    try {
      const data = await response.json();

      if (data.error) {
        message = data.error;
      }

      // The same session check the rest of this file does. See request() above.
      if (data.code === 'no_session') {
        goToLoginAfterSessionEnded();
      }
    } catch {
      // The server sent something that is not JSON. The default line above
      // is still true, so there is nothing to do here.
    }

    onEvent({ type: 'error', error: message });
    return;
  }

  /*
    Reading the stream.

    getReader hands back the connection a chunk at a time. A chunk is whatever
    happened to arrive together, which has nothing to do with where our events
    start and end: one chunk can hold three events, or half of one.

    So chunks are added to a buffer, and complete events are taken out of it.
    Each event ends with a blank line, which is what the split below looks for.
  */
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let buffer = '';

  while (true) {
    const chunk = await reader.read();

    if (chunk.done === true) {
      break;
    }

    buffer = buffer + decoder.decode(chunk.value, { stream: true });

    const pieces = buffer.split('\n\n');

    // The last piece is whatever came after the final blank line, which is an
    // event that has not finished arriving. It stays in the buffer.
    buffer = pieces.pop();

    for (const piece of pieces) {
      const line = piece.trim();

      if (line.startsWith('data:') === false) {
        continue;
      }

      try {
        onEvent(JSON.parse(line.slice(5).trim()));
      } catch {
        // A half-written event is not worth crashing the page over.
      }
    }
  }
}
