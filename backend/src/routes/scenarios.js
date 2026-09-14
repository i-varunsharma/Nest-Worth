import express from 'express';
import { requireUser } from '../lib/sessions.js';
import { readFinances } from '../lib/snapshot.js';

/*
    GET /api/scenarios   several ways this person could use the same money,
                         each played out fifteen years

  Read-only. It stores nothing and changes nothing: readFinances loads the
  person's data and runs shared/finances.js over it, the same code the
  dashboard runs in the browser, so the two cannot disagree.
*/

const router = express.Router();


router.get('/', requireUser, (req, res) => {
  const result = readFinances(req.user.id);

  // Somebody who skipped onboarding has nothing to build a scenario from, and
  // guessing at their income would make every number on the page fiction.
  if (result === null) {
    return res.status(400).json({
      error: 'Answer the household questions first, then there is something to compare.',
    });
  }

  const finances = result.finances;

  return res.json({
    scenarios: finances.scenarios,

    // The starting point every scenario is measured against, so the page can
    // say "you are here" without working any of it out again.
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
