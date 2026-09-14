import express from 'express';
import { requireUser } from '../middleware/auth.js';
import { badRequest } from '../http/errors.js';
import { transactionRepository } from '../repositories/transactionRepository.js';
import { buildRecap } from '../reports/recap.js';
import { readYear } from '../validation/records.js';

/*
    GET /api/recap/years    years that have transactions
    GET /api/recap?year=    that year, added up
*/

const router = express.Router();
router.use(requireUser);

router.get('/years', (req, res) => {
  res.json({ years: transactionRepository.listYears(req.user.id) });
});

router.get('/', (req, res) => {
  const year = readYear(req.query.year);

  if (year === '') {
    throw badRequest('A year looks like 2026.');
  }

  res.json({ recap: buildRecap(req.user.id, year) });
});

export default router;
