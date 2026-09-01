import express from 'express';
import db from '../database/db.js';
import { requireUser } from '../lib/sessions.js';
import { buildScenarios } from '../../../shared/scenarios.js';
import { bucketAmount, buildPlan } from '../../../shared/plan.js';
import { safetyNet } from '../../../shared/goals.js';
import { summariseNetWorth } from '../../../shared/networth.js';

/*
    GET /api/scenarios   several ways this person could use the same money,
                         each played out fifteen years

  Read-only, like the insights endpoint. It stores nothing and changes nothing:
  it gathers what this person has entered and runs the simulation in
  shared/scenarios.js over it.

  The simulation lives in shared/ rather than here for the usual reason. It is
  money maths, the browser charts its output, and one copy means the chart and
  the coach can never disagree about where a choice lands.
*/

const router = express.Router();


/* Turns database rows into the camelCase shape the shared maths expects. */
function toDebtShape(row) {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    principal: row.principal,
    annualRate: row.annual_rate,
    emi: row.emi,
  };
}


router.get('/', requireUser, (req, res) => {
  const household = db
    .prepare('SELECT * FROM households WHERE user_id = ?')
    .get(req.user.id);

  // Somebody who skipped onboarding has nothing to build a scenario from, and
  // guessing at their income would make every number on the page fiction.
  if (!household) {
    return res.status(400).json({
      error: 'Answer the household questions first, then there is something to compare.',
    });
  }

  const debtRows = db
    .prepare('SELECT * FROM debts WHERE user_id = ? ORDER BY annual_rate DESC')
    .all(req.user.id);

  const debts = debtRows.map(toDebtShape);

  const assetRows = db.prepare('SELECT * FROM assets WHERE user_id = ?').all(req.user.id);

  const assets = assetRows.map((row) => {
    return { name: row.name, kind: row.kind, value: row.value };
  });

  const netWorth = summariseNetWorth(assets, debts);

  /*
    What one month costs, and therefore what the emergency fund has to cover.

    Worked out exactly the way the dashboard does it: the discretionary spending
    the plan allows, plus everything that leaves before any choice is made. A
    different sum here would mean the two screens quietly disagreed about how
    long this person could survive without income.
  */
  let totalEmi = 0;
  debts.forEach((debt) => {
    totalEmi = totalEmi + debt.emi;
  });

  const worstDebt = debts[0];

  const plan = buildPlan({
    income: household.income,
    dependents: household.dependents,
    hasLoan: debts.length > 0,
    incomeVaries: household.income_varies === 1,
    essentialCosts: household.essential_costs,
    emi: totalEmi,
    topRate: worstDebt ? worstDebt.annualRate : undefined,
    topDebtName: worstDebt ? worstDebt.name.toLowerCase() : undefined,
  });

  const monthlyCosts = bucketAmount(plan, 'spend') + plan.support + plan.emi;

  const safety = safetyNet(
    netWorth.liquidAssets,
    monthlyCosts,
    household.dependents,
    household.income_varies === 1,
  );

  const scenarios = buildScenarios({
    household: {
      income: household.income,
      dependents: household.dependents,
      hasLoan: debts.length > 0,
      incomeVaries: household.income_varies === 1,
      essentialCosts: household.essential_costs,
    },
    debts: debts,
    liquidSavings: netWorth.liquidAssets,
    monthsTarget: safety.monthsTarget,
    monthlyCosts: monthlyCosts,
  });

  return res.json({
    scenarios: scenarios,

    // The starting point every scenario is measured against, so the page can
    // say "you are here" without working any of it out again.
    today: {
      income: household.income,
      monthlyCosts: monthlyCosts,
      liquidSavings: netWorth.liquidAssets,
      monthsCovered: Math.round(safety.monthsCovered * 10) / 10,
      monthsTarget: safety.monthsTarget,
      debtCount: debts.length,
      totalOwed: netWorth.totalDebts,
    },
  });
});


export default router;
