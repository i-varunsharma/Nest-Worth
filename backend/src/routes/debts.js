import express from 'express';
import db from '../db.js';
import { requireUser } from '../lib/sessions.js';

/*
  routes/debts.js
  ---------------
    GET    /api/debts      list mine
    POST   /api/debts      add one
    PUT    /api/debts/:id  change one
    DELETE /api/debts/:id  remove one

  Every query below filters on user_id from the session cookie, never from
  anything the browser sent. That single habit is what stops somebody reading
  another person's debts by changing the number in the URL.
*/

const router = express.Router();

const KINDS = ['education', 'personal', 'credit_card', 'home', 'vehicle', 'other'];


/* Turns a database row into the shape the frontend uses. */
function publicDebt(row) {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    principal: row.principal,
    annualRate: row.annual_rate,
    emi: row.emi,
  };
}


/*
  Checks one debt. Returns an error message, or an empty string.

  The interesting rule is the last one. An EMI smaller than the monthly interest
  means the balance grows every month and the loan never clears. That is a real
  situation for somebody paying the minimum on a credit card, but it is almost
  always a typo when entering a loan, so we refuse it and explain why.
*/
function checkDebt(body) {
  if (typeof body.name !== 'string' || body.name.trim().length === 0) {
    return 'Give this debt a name.';
  }
  if (body.name.trim().length > 60) {
    return 'That name is too long.';
  }
  if (!KINDS.includes(body.kind)) {
    return 'Pick what kind of debt this is.';
  }

  const principal = Number(body.principal);
  const annualRate = Number(body.annualRate);
  const emi = Number(body.emi);

  if (!Number.isFinite(principal) || principal <= 0 || principal > 1000000000) {
    return 'That outstanding amount does not look right.';
  }
  if (!Number.isFinite(annualRate) || annualRate < 0 || annualRate > 100) {
    return 'The interest rate should be between 0 and 100.';
  }
  if (!Number.isFinite(emi) || emi <= 0 || emi > 100000000) {
    return 'That EMI does not look right.';
  }

  const monthlyInterest = principal * (annualRate / 100 / 12);

  if (emi <= monthlyInterest) {
    const needed = Math.ceil(monthlyInterest);
    return `An EMI of that size never clears this debt. Interest alone is about ₹${needed} a month.`;
  }

  return '';
}


// ---------------------------------------------------------------
// GET /api/debts
// ---------------------------------------------------------------
router.get('/', requireUser, (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM debts WHERE user_id = ? ORDER BY annual_rate DESC, id ASC
  `).all(req.user.id);

  // Highest rate first, because that is the order they should be cleared in.
  return res.json({ debts: rows.map(publicDebt) });
});


// ---------------------------------------------------------------
// POST /api/debts
// ---------------------------------------------------------------
router.post('/', requireUser, (req, res) => {
  const error = checkDebt(req.body);

  if (error) {
    return res.status(400).json({ error });
  }

  const now = new Date().toISOString();

  const result = db.prepare(`
    INSERT INTO debts (user_id, name, kind, principal, annual_rate, emi, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.user.id,
    req.body.name.trim(),
    req.body.kind,
    Number(req.body.principal),
    Number(req.body.annualRate),
    Number(req.body.emi),
    now,
    now,
  );

  const row = db.prepare('SELECT * FROM debts WHERE id = ?').get(result.lastInsertRowid);

  return res.status(201).json({ debt: publicDebt(row) });
});


// ---------------------------------------------------------------
// PUT /api/debts/:id
// ---------------------------------------------------------------
router.put('/:id', requireUser, (req, res) => {
  const error = checkDebt(req.body);

  if (error) {
    return res.status(400).json({ error });
  }

  /*
    Note the "AND user_id = ?" on the update.

    Without it, anybody could edit any debt in the database by guessing an id.
    Putting the ownership check into the query itself, rather than fetching the
    row and checking it in JavaScript, means it cannot be forgotten.
  */
  const result = db.prepare(`
    UPDATE debts
    SET name = ?, kind = ?, principal = ?, annual_rate = ?, emi = ?, updated_at = ?
    WHERE id = ? AND user_id = ?
  `).run(
    req.body.name.trim(),
    req.body.kind,
    Number(req.body.principal),
    Number(req.body.annualRate),
    Number(req.body.emi),
    new Date().toISOString(),
    req.params.id,
    req.user.id,
  );

  // "changes" is how many rows were altered. Zero means there was no such debt
  // belonging to this person, so 404 is the honest answer.
  if (result.changes === 0) {
    return res.status(404).json({ error: 'No such debt.' });
  }

  const row = db.prepare('SELECT * FROM debts WHERE id = ?').get(req.params.id);

  return res.json({ debt: publicDebt(row) });
});


// ---------------------------------------------------------------
// DELETE /api/debts/:id
// ---------------------------------------------------------------
router.delete('/:id', requireUser, (req, res) => {
  const result = db.prepare('DELETE FROM debts WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.user.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'No such debt.' });
  }

  return res.json({ ok: true });
});


export default router;
