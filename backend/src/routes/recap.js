import express from 'express';
import db from '../database/db.js';
import { requireUser } from '../lib/sessions.js';
import { buildRecap } from '../lib/recap.js';

/*
    GET /api/recap/years    which years have anything in them
    GET /api/recap?year=    that year, added up
*/

const router = express.Router();

// Four digits. The year goes into a LIKE pattern, so it is checked first.
const YEAR_PATTERN = /^\d{4}$/;


// ---------------------------------------------------------------
// GET /api/recap/years
// ---------------------------------------------------------------
router.get('/years', requireUser, (req, res) => {
  const rows = db.prepare(`
    SELECT substr(occurred_on, 1, 4) AS year, COUNT(*) AS lines
    FROM transactions
    WHERE user_id = ?
    GROUP BY year
    ORDER BY year DESC
  `).all(req.user.id);

  return res.json({ years: rows });
});


// ---------------------------------------------------------------
// GET /api/recap?year=2026
// ---------------------------------------------------------------
router.get('/', requireUser, (req, res) => {
  let year = req.query.year;

  if (year === undefined || year === '') {
    year = String(new Date().getFullYear());
  }

  if (YEAR_PATTERN.test(String(year)) === false) {
    return res.status(400).json({ error: 'A year looks like 2026.' });
  }

  return res.json({ recap: buildRecap(req.user.id, String(year)) });
});


export default router;
