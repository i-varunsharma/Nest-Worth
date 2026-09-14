import express from 'express';
import db from '../database/db.js';
import { requireUser } from '../lib/sessions.js';
import { checkHousehold } from '../lib/validate.js';
import { householdFromRow } from '../lib/rows.js';

/*
  Reading and saving the onboarding answers.

    GET /api/household   what did this person tell us?
    PUT /api/household   save what they just told us

  Neither route takes a user id from the request. It always comes from the
  session cookie. Trusting an id sent by the browser is how apps end up letting
  anyone read anyone else's data by changing a number in a URL.

  PUT rather than POST because there is only ever one household per person, so
  this replaces it rather than adding another.
*/

const router = express.Router();

// Used before anyone has answered the questions.
const DEFAULTS = {
  income: 62000,
  dependents: 2,
  hasLoan: true,
  incomeVaries: false,
  essentialCosts: 0,
};


/*
  Turns a database row into the shape the frontend uses. The translation itself
  lives in lib/rows.js; this only adds isSaved and the defaults.
*/
function publicHousehold(row) {
  const household = householdFromRow(row);

  if (household === null) {
    return { ...DEFAULTS, chosenPlan: null, isSaved: false };
  }

  return { ...household, isSaved: true };
}


// ---------------------------------------------------------------
// GET /api/household
// ---------------------------------------------------------------
router.get('/', requireUser, (req, res) => {
  const row = db.prepare('SELECT * FROM households WHERE user_id = ?').get(req.user.id);

  // isSaved separates someone who chose these numbers from someone who has not
  // answered yet, which is what decides between the dashboard and onboarding.
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

  let hasLoan = 0;
  if (req.body.hasLoan === true) {
    hasLoan = 1;
  }

  // Anything that is not exactly true counts as a steady income, which covers
  // an older caller that does not send this field at all.
  let incomeVaries = 0;
  if (req.body.incomeVaries === true) {
    incomeVaries = 1;
  }

  // Missing means not answered, which is stored as zero and behaves the way
  // the plan did before this question existed.
  let essentialCosts = 0;
  if (req.body.essentialCosts !== undefined) {
    essentialCosts = Math.round(Number(req.body.essentialCosts));
  }

  // Insert, or update if a row already exists, in one statement. Doing it as a
  // SELECT and then an INSERT or UPDATE is two trips to the database, with a
  // gap in the middle where another request could slip in.
  db.prepare(`
    INSERT INTO households
      (user_id, income, dependents, has_loan, income_varies, essential_costs, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      income          = excluded.income,
      dependents      = excluded.dependents,
      has_loan        = excluded.has_loan,
      income_varies   = excluded.income_varies,
      essential_costs = excluded.essential_costs,
      updated_at      = excluded.updated_at
  `).run(
    req.user.id, income, dependents, hasLoan, incomeVaries, essentialCosts,
    new Date().toISOString(),
  );

  const row = db.prepare('SELECT * FROM households WHERE user_id = ?').get(req.user.id);

  return res.json({ household: publicHousehold(row) });
});


// ---------------------------------------------------------------
// PUT /api/household/plan
// ---------------------------------------------------------------
/*
  Chooses which of the plans on /plans to follow, and the dashboard then shows
  that one instead of the default split.

  It is its own route rather than part of the household PUT above, because it
  is a different action. Saving the household means "these are my numbers" and
  needs every field; this means "I pick that one" and needs a single word.
  Folding it in would mean sending the whole household back to change a plan,
  and every page that did so would need to remember every other field.
*/
router.put('/plan', requireUser, (req, res) => {
  const chosen = req.body.plan;

  /*
    The keys the app can actually produce. Anything else is a browser sending
    something the page never offered, and storing it would leave the dashboard
    looking for a plan that does not exist.

    null is allowed and means "go back to the recommended split".
  */
  const KNOWN_PLANS = ['balanced', 'debt', 'buffer', 'invest'];

  if (chosen !== null && KNOWN_PLANS.includes(chosen) === false) {
    return res.status(400).json({ error: 'That is not one of the plans.' });
  }

  const result = db.prepare(`
    UPDATE households SET chosen_plan = ?, updated_at = ? WHERE user_id = ?
  `).run(chosen, new Date().toISOString(), req.user.id);

  // No row means they never answered the onboarding questions, so there is no
  // household to attach a plan to yet.
  if (result.changes === 0) {
    return res.status(400).json({
      error: 'Answer the household questions first, then you can choose a plan.',
    });
  }

  const row = db.prepare('SELECT * FROM households WHERE user_id = ?').get(req.user.id);

  return res.json({ household: publicHousehold(row) });
});


// ---------------------------------------------------------------
// PUT /api/household/name
// ---------------------------------------------------------------
// Someone who signed up by phone has no name yet, so this lets them add one.
router.put('/name', requireUser, (req, res) => {
  const name = req.body.name;

  if (typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ error: 'Please enter your name.', field: 'name' });
  }

  db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name.trim(), req.user.id);

  return res.json({ name: name.trim() });
});


export default router;
