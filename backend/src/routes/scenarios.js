import express from 'express';
import { requireUser } from '../middleware/auth.js';
import { badRequest } from '../http/errors.js';
import { readFinances } from '../services/financeService.js';

// GET /api/scenarios  every plan played out fifteen years, and where they start from.
const router = express.Router();

router.get('/', requireUser, (req, res) => {
  const result = readFinances(req.user.id);

  if (result === null) {
    throw badRequest('Answer the household questions first, then there is something to compare.');
  }

  const finances = result.finances;

  res.json({
    scenarios: finances.scenarios,
    today: {
      income: finances.recommendedPlan.income,
      monthlyCosts: finances.monthlyCosts,
      liquidSavings: finances.netWorth.liquidAssets,
      monthsCovered: Math.round(finances.safety.monthsCovered * 10) / 10,
      monthsTarget: finances.safety.monthsTarget,
      debtCount: result.snapshot.debts.length,
      totalOwed: finances.netWorth.totalDebts,
    },
  });
});

export default router;
