import express from 'express';
import db from '../database/db.js';
import { requireUser } from '../lib/sessions.js';
import { familyMemberFromRow } from '../lib/rows.js';
import { checkFamilyMember } from '../../../shared/family.js';

/*
    GET    /api/family      list the people I support
    POST   /api/family      add one
    PUT    /api/family/:id  change one
    DELETE /api/family/:id  remove one

  The same four routes as debts, goals and assets. Every query filters on the
  user id from the session cookie, never on anything the browser sent.
*/

const router = express.Router();

// Enough for a large joint family. More than this is a script, not a person.
const MAX_MEMBERS = 30;


/* The values to store, pulled out of a body that has already passed checkFamilyMember. */
function valuesFrom(body) {
  let hasHealthCover = 0;
  if (body.hasHealthCover === true) {
    hasHealthCover = 1;
  }

  return {
    name: body.name.trim(),
    relation: body.relation,
    monthlySupport: Math.round(Number(body.monthlySupport)),
    hasHealthCover: hasHealthCover,
  };
}


// ---------------------------------------------------------------
// GET /api/family
// ---------------------------------------------------------------
router.get('/', requireUser, (req, res) => {
  const rows = db
    .prepare('SELECT * FROM family_members WHERE user_id = ? ORDER BY id ASC')
    .all(req.user.id);

  return res.json({ family: rows.map(familyMemberFromRow) });
});


// ---------------------------------------------------------------
// POST /api/family
// ---------------------------------------------------------------
router.post('/', requireUser, (req, res) => {
  const error = checkFamilyMember(req.body);

  if (error) {
    return res.status(400).json({ error });
  }

  const count = db
    .prepare('SELECT COUNT(*) AS total FROM family_members WHERE user_id = ?')
    .get(req.user.id);

  if (count.total >= MAX_MEMBERS) {
    return res.status(400).json({ error: 'That is as many people as one account can list.' });
  }

  const values = valuesFrom(req.body);
  const now = new Date().toISOString();

  const result = db.prepare(`
    INSERT INTO family_members
      (user_id, name, relation, monthly_support, has_health_cover, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.user.id,
    values.name,
    values.relation,
    values.monthlySupport,
    values.hasHealthCover,
    now,
    now,
  );

  const row = db
    .prepare('SELECT * FROM family_members WHERE id = ? AND user_id = ?')
    .get(result.lastInsertRowid, req.user.id);

  return res.status(201).json({ member: familyMemberFromRow(row) });
});


// ---------------------------------------------------------------
// PUT /api/family/:id
// ---------------------------------------------------------------
router.put('/:id', requireUser, (req, res) => {
  const error = checkFamilyMember(req.body);

  if (error) {
    return res.status(400).json({ error });
  }

  const values = valuesFrom(req.body);

  // "AND user_id = ?" is the ownership check. Zero changes means this id does
  // not belong to this person, and 404 is the honest answer.
  const result = db.prepare(`
    UPDATE family_members
    SET name = ?, relation = ?, monthly_support = ?, has_health_cover = ?, updated_at = ?
    WHERE id = ? AND user_id = ?
  `).run(
    values.name,
    values.relation,
    values.monthlySupport,
    values.hasHealthCover,
    new Date().toISOString(),
    req.params.id,
    req.user.id,
  );

  if (result.changes === 0) {
    return res.status(404).json({ error: 'No such person.' });
  }

  const row = db
    .prepare('SELECT * FROM family_members WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);

  return res.json({ member: familyMemberFromRow(row) });
});


// ---------------------------------------------------------------
// DELETE /api/family/:id
// ---------------------------------------------------------------
router.delete('/:id', requireUser, (req, res) => {
  const result = db
    .prepare('DELETE FROM family_members WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.user.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'No such person.' });
  }

  return res.json({ ok: true });
});


export default router;
