import express from 'express';
import db from '../database/db.js';
import { requireUser } from '../lib/sessions.js';

/*
    GET    /api/assets      list mine
    POST   /api/assets      add one
    PUT    /api/assets/:id  change one
    DELETE /api/assets/:id  remove one

  An asset is anything owned that has a rupee value: a savings account, a mutual
  fund, gold, a flat. Assets and debts are the two halves of net worth.
*/

const router = express.Router();

const KINDS = ['cash', 'fd', 'mutual_fund', 'stocks', 'epf', 'gold', 'property', 'other'];


function publicAsset(row) {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    value: row.value,
  };
}


function checkAsset(body) {
  if (typeof body.name !== 'string' || body.name.trim().length === 0) {
    return 'Give this a name.';
  }
  if (body.name.trim().length > 60) {
    return 'That name is too long.';
  }
  if (!KINDS.includes(body.kind)) {
    return 'Pick what kind of asset this is.';
  }

  const value = Number(body.value);

  // Zero is allowed, for an account somebody has opened but not funded yet.
  if (!Number.isFinite(value) || value < 0 || value > 1000000000) {
    return 'That value does not look right.';
  }

  return '';
}


// ---------------------------------------------------------------
// GET /api/assets
// ---------------------------------------------------------------
router.get('/', requireUser, (req, res) => {
  // Largest first, so the things that matter most are at the top.
  const rows = db.prepare(`
    SELECT * FROM assets WHERE user_id = ? ORDER BY value DESC, id ASC
  `).all(req.user.id);

  return res.json({ assets: rows.map(publicAsset) });
});


// ---------------------------------------------------------------
// POST /api/assets
// ---------------------------------------------------------------
router.post('/', requireUser, (req, res) => {
  const error = checkAsset(req.body);

  if (error) {
    return res.status(400).json({ error });
  }

  const now = new Date().toISOString();

  const result = db.prepare(`
    INSERT INTO assets (user_id, name, kind, value, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.user.id, req.body.name.trim(), req.body.kind, Number(req.body.value), now, now);

  const row = db.prepare('SELECT * FROM assets WHERE id = ?').get(result.lastInsertRowid);

  return res.status(201).json({ asset: publicAsset(row) });
});


// ---------------------------------------------------------------
// PUT /api/assets/:id
// ---------------------------------------------------------------
router.put('/:id', requireUser, (req, res) => {
  const error = checkAsset(req.body);

  if (error) {
    return res.status(400).json({ error });
  }

  const result = db.prepare(`
    UPDATE assets
    SET name = ?, kind = ?, value = ?, updated_at = ?
    WHERE id = ? AND user_id = ?
  `).run(
    req.body.name.trim(),
    req.body.kind,
    Number(req.body.value),
    new Date().toISOString(),
    req.params.id,
    req.user.id,
  );

  if (result.changes === 0) {
    return res.status(404).json({ error: 'No such asset.' });
  }

  // Filtered on the user id like every other query in this file. The
  // changes check above already proves the row is theirs, so this changes
  // nothing today. It is here so the rule holds everywhere without
  // exception, and nobody has to work out which lines are the safe ones.
  const row = db.prepare('SELECT * FROM assets WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);

  return res.json({ asset: publicAsset(row) });
});


// ---------------------------------------------------------------
// DELETE /api/assets/:id
// ---------------------------------------------------------------
router.delete('/:id', requireUser, (req, res) => {
  const result = db.prepare('DELETE FROM assets WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.user.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'No such asset.' });
  }

  return res.json({ ok: true });
});


export default router;
