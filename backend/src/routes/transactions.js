import express from 'express';
import { requireUser } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { badRequest, notFound } from '../http/errors.js';
import { readId } from '../http/validate.js';
import { transactionRepository } from '../repositories/transactionRepository.js';
import { importStatement, summariseMonth } from '../services/transactionService.js';
import { MONTH_PATTERN, readMonth } from '../validation/records.js';
import { isKnownCategory } from '../../../shared/categories.js';

/*
    POST   /api/transactions/import        read a statement CSV
    GET    /api/transactions/months        months that have transactions
    GET    /api/transactions/summary       one month, added up by category
    GET    /api/transactions               one month, line by line
    PATCH  /api/transactions/:id           correct one category
    DELETE /api/transactions/month/:month  remove a whole month after a wrong import
*/

const router = express.Router();
router.use(requireUser);

const BAD_MONTH = 'A month looks like 2026-08.';

// Parsing is real work, so imports are capped more tightly than reads.
const importLimit = rateLimit({
  limit: 20,
  windowMs: 60 * 60 * 1000,
  message: 'That is a lot of statements in one hour. Try again a little later.',
});

function monthFromQuery(req) {
  const month = readMonth(req.query.month);

  if (month === '') {
    throw badRequest(BAD_MONTH);
  }

  return month;
}


router.post('/import', importLimit, (req, res) => {
  res.status(201).json(importStatement(req.user.id, req.body.csv));
});

router.get('/months', (req, res) => {
  res.json({ months: transactionRepository.listMonths(req.user.id) });
});

router.get('/summary', (req, res) => {
  res.json({ summary: summariseMonth(req.user.id, monthFromQuery(req)) });
});

router.get('/', (req, res) => {
  res.json({ transactions: transactionRepository.listForMonth(req.user.id, monthFromQuery(req)) });
});

router.patch('/:id', (req, res) => {
  if (isKnownCategory(req.body.category) === false) {
    throw badRequest('That is not a category.');
  }

  const id = readId(req, 'No such transaction.');
  const updated = transactionRepository.setCategory(req.user.id, id, req.body.category);

  if (updated === null) {
    throw notFound('No such transaction.');
  }

  res.json({ transaction: updated });
});

router.delete('/month/:month', (req, res) => {
  if (MONTH_PATTERN.test(req.params.month) === false) {
    throw badRequest(BAD_MONTH);
  }

  res.json({ removed: transactionRepository.removeMonth(req.user.id, req.params.month) });
});


export default router;
