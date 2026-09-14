/*
  Every request to the backend goes through this file, so pages call
  api.login(email, password) without dealing with URLs, headers or cookies.

  credentials: 'include' sends the session cookie. Without it every request looks
  like it came from a stranger. The server's CORS setting allows it.
*/

// Where the backend lives. A different port from the React app in development,
// which is why CORS has to be set up. Set VITE_API_URL when you deploy.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';


/*
  Sends one request and always returns the same shape, so pages check result.ok
  instead of wrapping every call in try and catch:

    { ok: true,  data }
    { ok: false, error, field, code, status }

  field names the form input the error belongs to, when the server knows it.
*/
/*
  A session that ends while a page is open (a tab left overnight) sends the next
  request back with code 'no_session'. The browser goes to the login page for that
  code only: a wrong password is also a 401 and must stay on its own page. A full
  page load clears state that belonged to the old session.
*/
function goToLoginAfterSessionEnded() {
  const alreadyThere = window.location.pathname === '/login';

  if (alreadyThere === false) {
    window.location.href = '/login';
  }
}


// isAuthCheck is true only for me(), whose job is to ask whether anybody is
// signed in, so a 401 there is an answer rather than an ended session.
async function request(path, method, body, isAuthCheck) {
  const options = {
    method: method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  };

  // GET requests cannot have a body.
  if (body) {
    options.body = JSON.stringify(body);
  }

  let response;

  try {
    response = await fetch(API_URL + path, options);
  } catch {
    // The request never arrived: the server is down, the network is off, or the
    // address is wrong.
    return { ok: false, error: 'Cannot reach the server. Is the backend running on port 4000?' };
  }

  let data = {};

  try {
    data = await response.json();
  } catch {
    // Not JSON, for example an HTML error page from a proxy. Not a network problem.
    data = {};
  }

  if (response.ok === false) {
    if (data.code === 'no_session' && isAuthCheck !== true) {
      goToLoginAfterSessionEnded();
    }

    let error = 'Something went wrong. Please try again.';
    if (data.error) {
      error = data.error;
    }

    return { ok: false, error: error, field: data.field, code: data.code, status: response.status };
  }

  return { ok: true, data: data };
}


// Accounts

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


// Forgotten passwords

// Step one: ask for a reset link. Answers the same whether or not the email has
// an account, so it cannot be used to find out who has signed up.
export function forgotPassword(email) {
  return request('/api/auth/forgot', 'POST', { email });
}

// Step two: the token from the link and the new password. Success also signs in.
export function resetPassword(token, password) {
  return request('/api/auth/reset', 'POST', { token, password });
}


// Changes the password while signed in. currentPassword is ignored for an account
// that never had one (Google or phone sign-in).
export function changePassword(currentPassword, newPassword) {
  return request('/api/auth/password', 'POST', { currentPassword, newPassword });
}


// Deletes the account and everything in it. Needs the password, or the word DELETE
// for an account without one.
export function deleteAccount(password, confirmText) {
  return request('/api/auth/account', 'DELETE', { password, confirmText });
}


// Signing in with a phone number

export function sendOtp(phone) {
  return request('/api/auth/otp/send', 'POST', { phone });
}

export function verifyOtp(phone, code) {
  return request('/api/auth/otp/verify', 'POST', { phone, code });
}


// Signing in with Google

// "credential" is the token Google's sign-in window gives us. It goes straight
// to our server, which checks it with Google before believing any of it.
export function google(credential) {
  return request('/api/auth/google', 'POST', { credential });
}


// The household

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


// Debts, goals, assets, family and check-ins: GET lists, POST adds, PUT changes
// and DELETE removes one by id.

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


// The people this salary supports. The same four routes as above.

export function getFamily() {
  return request('/api/family', 'GET');
}

export function addFamilyMember(member) {
  return request('/api/family', 'POST', member);
}

export function updateFamilyMember(id, member) {
  return request('/api/family/' + id, 'PUT', member);
}

export function deleteFamilyMember(id) {
  return request('/api/family/' + id, 'DELETE');
}


// Transactions from bank statements

export function importStatement(csv) {
  return request('/api/transactions/import', 'POST', { csv: csv });
}

// Which months have anything in them, newest first.
export function getTransactionMonths() {
  return request('/api/transactions/months', 'GET');
}

// One month added up by category on the server.
export function getSpendingSummary(month) {
  return request('/api/transactions/summary?month=' + month, 'GET');
}

// One month, line by line. This is the list somebody scrolls to correct a
// wrong category.
export function getTransactions(month) {
  return request('/api/transactions?month=' + month, 'GET');
}

export function setTransactionCategory(id, category) {
  return request('/api/transactions/' + id, 'PATCH', { category: category });
}

export function deleteTransactionMonth(month) {
  return request('/api/transactions/month/' + month, 'DELETE');
}


// The daily dashboard note. Reading it writes it on the first visit of the day.

export function getBriefing() {
  return request('/api/briefing', 'GET');
}


// The year in review

export function getRecapYears() {
  return request('/api/recap/years', 'GET');
}

export function getRecap(year) {
  return request('/api/recap?year=' + year, 'GET');
}


// Reports and plans

// Averages, running totals and groupings, worked out in SQL on the server.
export function getInsights() {
  return request('/api/insights', 'GET');
}


// Every plan played out fifteen years, by shared/scenarios.js on the server.
export function getScenarios() {
  return request('/api/scenarios', 'GET');
}


// Follows a plan from /plans, or goes back to the recommended one with null.
export function choosePlan(plan) {
  return request('/api/household/plan', 'PUT', { plan: plan });
}


export function getCheckins() {
  return request('/api/checkins', 'GET');
}

/* Saving a month that already exists updates it rather than adding a second. */
export function saveCheckin(checkin) {
  return request('/api/checkins', 'POST', checkin);
}


// The AI coach

/*
  Asks the coach a question and reads the answer as it streams.

  The only call here that does not use request(), because the server keeps the
  connection open and sends Server-Sent Events rather than one JSON object.

    question  empty means "what should I do this month"
    history   earlier turns as [{ role, text }]; the server stores no conversation
    onEvent   called with { type: 'text', text }, { type: 'tool', label },
              { type: 'error', error } or { type: 'done' }

  No money figures are sent: the server reads them from the database.
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

  // A refusal is ordinary JSON with an error status, sent before any streaming.
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

  // Chunks arrive in arbitrary pieces, so they are added to a buffer and complete
  // events, each ending in a blank line, are taken out of it.
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
