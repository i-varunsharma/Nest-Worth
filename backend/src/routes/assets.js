import express from 'express';
import db from '../db.js';
import { requireUser } from '../lib/sessions.js';

/*
  routes/assets.js
  ----------------
    GET    /api/assets      list mine
    POST   /api/assets      add one
    PUT    /api/assets/:id  change one
    DELETE /api/assets/:id  remove one

  An asset is anything owned that has a rupee value: a savings account, a
  mutual fund, gold, a flat. Together with the debts, these are the two halves
  of net worth.
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

  // Zero is allowed. Somebody may want to list an account they have opened but
  // not put anything into yet, and refusing that is just annoying.
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

  const row = db.prepare('SELECT * FROM assets WHERE id = ?').get(req.params.id);

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
