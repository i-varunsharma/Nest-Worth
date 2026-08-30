import express from 'express';
import db from '../db.js';
import { requireUser } from '../lib/sessions.js';

/*
  routes/checkins.js
  ------------------
    GET  /api/checkins   the last two years, newest first
    POST /api/checkins   record or update one month

  A check-in is what ACTUALLY happened in a month, as opposed to what the plan
  said should happen. Recording it is what turns the app from a calculator into
  something with a memory: after a few months there is a real history to compare
  the plan against.

  There is one check-in per person per month. Saving the same month again
  updates it rather than adding a second, which is what the UNIQUE line on the
  table and the ON CONFLICT clause below arrange between them.
*/

const router = express.Router();

// Two years of history is plenty to look back on, and keeps the response small.
const MONTHS_TO_RETURN = 24;


function publicCheckin(row) {
  return {
    id: row.id,
    month: row.month,
    income: row.income,
    spent: row.spent,
    saved: row.saved,
    invested: row.invested,
    note: row.note,
  };
}


function checkCheckin(body) {
  // 'YYYY-MM'. Checking the shape by hand rather than with a regular
  // expression, because this is easier to read and just as reliable here.
  if (typeof body.month !== 'string' || body.month.length !== 7 || body.month[4] !== '-') {
    return 'That month is not in the right form.';
  }

  const year = Number(body.month.slice(0, 4));
  const monthNumber = Number(body.month.slice(5, 7));

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return 'That year does not look right.';
  }
  if (!Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12) {
    return 'That month does not look right.';
  }

  const fields = ['income', 'spent', 'saved', 'invested'];

  for (const field of fields) {
    const value = Number(body[field]);

    if (!Number.isFinite(value) || value < 0 || value > 1000000000) {
      return `The ${field} figure does not look right.`;
    }
  }

  if (typeof body.note === 'string' && body.note.length > 300) {
    return 'That note is too long.';
  }

  return '';
}


// ---------------------------------------------------------------
// GET /api/checkins
// ---------------------------------------------------------------
router.get('/', requireUser, (req, res) => {
  // Because the month is stored as 'YYYY-MM', sorting it as text puts it in
  // date order. That is the whole reason for storing it that way round.
  const rows = db.prepare(`
    SELECT * FROM checkins WHERE user_id = ? ORDER BY month DESC LIMIT ?
  `).all(req.user.id, MONTHS_TO_RETURN);

  return res.json({ checkins: rows.map(publicCheckin) });
});


// ---------------------------------------------------------------
// POST /api/checkins
// ---------------------------------------------------------------
router.post('/', requireUser, (req, res) => {
  const error = checkCheckin(req.body);

  if (error) {
    return res.status(400).json({ error });
  }

  let note = '';
  if (typeof req.body.note === 'string') {
    note = req.body.note.trim();
  }

  db.prepare(`
    INSERT INTO checkins (user_id, month, income, spent, saved, invested, note, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, month) DO UPDATE SET
      income   = excluded.income,
      spent    = excluded.spent,
      saved    = excluded.saved,
      invested = excluded.invested,
      note     = excluded.note
  `).run(
    req.user.id,
    req.body.month,
    Number(req.body.income),
    Number(req.body.spent),
    Number(req.body.saved),
    Number(req.body.invested),
    note,
    new Date().toISOString(),
  );

  const row = db.prepare('SELECT * FROM checkins WHERE user_id = ? AND month = ?')
    .get(req.user.id, req.body.month);

  return res.json({ checkin: publicCheckin(row) });
});


export default router;
