import express from 'express';
import db from '../database/db.js';
import { requireUser } from '../lib/sessions.js';

/*
    GET    /api/goals      list mine
    POST   /api/goals      add one
    PUT    /api/goals/:id  change one
    DELETE /api/goals/:id  remove one

  Same shape as debts.js, and the same rule: every query filters on the user id
  from the session cookie.
*/

const router = express.Router();


function publicGoal(row) {
  return {
    id: row.id,
    name: row.name,
    targetAmount: row.target_amount,
    savedAmount: row.saved_amount,
    targetDate: row.target_date,
  };
}


/*
  Checks one goal.

  A date in the past is allowed. A goal whose deadline has slipped is a real
  thing people need to see, and the interface marks it overdue. Refusing to
  store it would only hide the problem.
*/
function checkGoal(body) {
  if (typeof body.name !== 'string' || body.name.trim().length === 0) {
    return 'Give this goal a name.';
  }
  if (body.name.trim().length > 60) {
    return 'That name is too long.';
  }

  const targetAmount = Number(body.targetAmount);
  const savedAmount = Number(body.savedAmount);

  if (!Number.isFinite(targetAmount) || targetAmount <= 0 || targetAmount > 1000000000) {
    return 'That target amount does not look right.';
  }
  if (!Number.isFinite(savedAmount) || savedAmount < 0 || savedAmount > 1000000000) {
    return 'That saved amount does not look right.';
  }
  if (savedAmount > targetAmount) {
    return 'You have saved more than the target. Raise the target, or mark it done.';
  }

  // Dates arrive as 'YYYY-MM-DD' from a date input. Date.parse returns NaN for
  // anything it cannot read.
  if (typeof body.targetDate !== 'string' || Number.isNaN(Date.parse(body.targetDate))) {
    return 'Pick a target date.';
  }

  return '';
}


// ---------------------------------------------------------------
// GET /api/goals
// ---------------------------------------------------------------
router.get('/', requireUser, (req, res) => {
  // Soonest deadline first, which is the order somebody needs to act in.
  const rows = db.prepare(`
    SELECT * FROM goals WHERE user_id = ? ORDER BY target_date ASC, id ASC
  `).all(req.user.id);

  return res.json({ goals: rows.map(publicGoal) });
});


// ---------------------------------------------------------------
// POST /api/goals
// ---------------------------------------------------------------
router.post('/', requireUser, (req, res) => {
  const error = checkGoal(req.body);

  if (error) {
    return res.status(400).json({ error });
  }

  const now = new Date().toISOString();

  const result = db.prepare(`
    INSERT INTO goals (user_id, name, target_amount, saved_amount, target_date, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.user.id,
    req.body.name.trim(),
    Number(req.body.targetAmount),
    Number(req.body.savedAmount),
    req.body.targetDate,
    now,
    now,
  );

  const row = db.prepare('SELECT * FROM goals WHERE id = ?').get(result.lastInsertRowid);

  return res.status(201).json({ goal: publicGoal(row) });
});


// ---------------------------------------------------------------
// PUT /api/goals/:id
// ---------------------------------------------------------------
router.put('/:id', requireUser, (req, res) => {
  const error = checkGoal(req.body);

  if (error) {
    return res.status(400).json({ error });
  }

  const result = db.prepare(`
    UPDATE goals
    SET name = ?, target_amount = ?, saved_amount = ?, target_date = ?, updated_at = ?
    WHERE id = ? AND user_id = ?
  `).run(
    req.body.name.trim(),
    Number(req.body.targetAmount),
    Number(req.body.savedAmount),
    req.body.targetDate,
    new Date().toISOString(),
    req.params.id,
    req.user.id,
  );

  if (result.changes === 0) {
    return res.status(404).json({ error: 'No such goal.' });
  }

  const row = db.prepare('SELECT * FROM goals WHERE id = ?').get(req.params.id);

  return res.json({ goal: publicGoal(row) });
});


// ---------------------------------------------------------------
// DELETE /api/goals/:id
// ---------------------------------------------------------------
router.delete('/:id', requireUser, (req, res) => {
  const result = db.prepare('DELETE FROM goals WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.user.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'No such goal.' });
  }

  return res.json({ ok: true });
});


export default router;
