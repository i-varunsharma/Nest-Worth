import db from '../database/db.js';

// One household per user: the onboarding answers everything else is built from.

function householdFromRow(row) {
  return {
    income: row.income,
    dependents: row.dependents,
    hasLoan: row.has_loan === 1,
    incomeVaries: row.income_varies === 1,
    essentialCosts: row.essential_costs,

    // Which plan from /plans they chose, or null.
    chosenPlan: row.chosen_plan,
  };
}

const findStatement = db.prepare('SELECT * FROM households WHERE user_id = ?');

// Insert or update in one statement, so there is no gap between a check and a write.
const saveStatement = db.prepare(`
  INSERT INTO households
    (user_id, income, dependents, has_loan, income_varies, essential_costs, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(user_id) DO UPDATE SET
    income          = excluded.income,
    dependents      = excluded.dependents,
    has_loan        = excluded.has_loan,
    income_varies   = excluded.income_varies,
    essential_costs = excluded.essential_costs,
    updated_at      = excluded.updated_at
`);

const choosePlanStatement = db.prepare(
  'UPDATE households SET chosen_plan = ?, updated_at = ? WHERE user_id = ?',
);

export const householdRepository = {
  /* Returns null when onboarding was never finished. */
  find(userId) {
    const row = findStatement.get(userId);

    if (!row) {
      return null;
    }

    return householdFromRow(row);
  },

  save(userId, household) {
    saveStatement.run(
      userId,
      household.income,
      household.dependents,
      household.hasLoan ? 1 : 0,
      household.incomeVaries ? 1 : 0,
      household.essentialCosts,
      new Date().toISOString(),
    );

    return this.find(userId);
  },

  /* Returns null when there is no household to attach the choice to. */
  choosePlan(userId, planKey) {
    const result = choosePlanStatement.run(planKey, new Date().toISOString(), userId);

    if (result.changes === 0) {
      return null;
    }

    return this.find(userId);
  },
};
