import express from 'express';
import db from '../db.js';
import { requireUser } from '../lib/sessions.js';
import { checkHousehold } from '../lib/validate.js';

/*
  routes/household.js
  -------------------
  Reading and saving the three onboarding answers.

    GET /api/household   what did this person tell us?
    PUT /api/household   save what they just told us

  Both routes sit behind requireUser, so there is no way to read or change
  somebody else's household. Notice that neither route takes a user id from the
  request. It always comes from the session cookie. Trusting an id sent by the
  browser is how apps end up letting anyone read anyone else's data by changing
  a number in the URL.

  PUT rather than POST because this replaces the whole household with the
  version being sent, rather than adding a new one. There is only ever one per
  person.
*/

const router = express.Router();

// Used before anyone has answered the questions.
const DEFAULTS = {
  income: 62000,
  dependents: 2,
  hasLoan: true,
};


/* Turns a database row into the shape the frontend uses. */
function publicHousehold(row) {
  if (!row) {
    return { ...DEFAULTS, isSaved: false };
  }

  return {
    income: row.income,
    dependents: row.dependents,

    // SQLite stores 1 and 0, but the frontend wants true and false.
    hasLoan: row.has_loan === 1,

    isSaved: true,
  };
}


// ---------------------------------------------------------------
// GET /api/household
// ---------------------------------------------------------------
router.get('/', requireUser, (req, res) => {
  const row = db.prepare('SELECT * FROM households WHERE user_id = ?').get(req.user.id);

  // "isSaved" lets the frontend tell the difference between someone who chose
  // these numbers and someone who has not answered yet, which decides whether
  // to show them the dashboard or send them to onboarding.
  return res.json({ household: publicHousehold(row) });
});


// ---------------------------------------------------------------
// PUT /api/household
// ---------------------------------------------------------------
router.put('/', requireUser, (req, res) => {
  const error = checkHousehold(req.body);

  if (error) {
    return res.status(400).json({ error });
  }

  const income = Math.round(Number(req.body.income));
  const dependents = Number(req.body.dependents);
  const hasLoan = req.body.hasLoan === true ? 1 : 0;

  /*
    "Insert, or update if a row already exists" in one statement. The alternative
    is to SELECT first and then choose between INSERT and UPDATE, which is two
    trips to the database and has a gap in the middle where another request
    could slip in.
  */
  db.prepare(`
    INSERT INTO households (user_id, income, dependents, has_loan, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      income     = excluded.income,
      dependents = excluded.dependents,
      has_loan   = excluded.has_loan,
      updated_at = excluded.updated_at
  `).run(req.user.id, income, dependents, hasLoan, new Date().toISOString());

  const row = db.prepare('SELECT * FROM households WHERE user_id = ?').get(req.user.id);

  return res.json({ household: publicHousehold(row) });
});


// ---------------------------------------------------------------
// PUT /api/household/name
// ---------------------------------------------------------------
// Someone who signed up with a phone number has no name yet. This lets them
// add one later without needing a whole settings page.
router.put('/name', requireUser, (req, res) => {
  const name = req.body.name;

  if (typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ error: 'Please enter your name.', field: 'name' });
  }

  db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name.trim(), req.user.id);

  return res.json({ name: name.trim() });
});


export default router;
