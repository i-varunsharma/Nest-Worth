/*
  Turns database rows into the shapes the rest of the app uses.

  The database uses snake_case column names and stores true and false as 1 and
  0. The API, the browser and the maths in shared/ all use camelCase and real
  booleans. Every translation happens here, once.

  These used to be copied into several route and lib files. A column added to
  one copy and not the others is a bug that only shows up on one page, so keep
  them all in this file.

  Each function also decides which fields are allowed out. A row is never sent
  as it is, so a column added later cannot leak by accident.
*/


export function debtFromRow(row) {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    principal: row.principal,
    annualRate: row.annual_rate,
    emi: row.emi,
  };
}


export function goalFromRow(row) {
  return {
    id: row.id,
    name: row.name,
    targetAmount: row.target_amount,
    savedAmount: row.saved_amount,
    targetDate: row.target_date,
  };
}


export function assetFromRow(row) {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    value: row.value,
  };
}


export function familyMemberFromRow(row) {
  return {
    id: row.id,
    name: row.name,
    relation: row.relation,
    monthlySupport: row.monthly_support,
    hasHealthCover: row.has_health_cover === 1,
  };
}


/* Returns null when there is no row, meaning onboarding was never finished. */
export function householdFromRow(row) {
  if (!row) {
    return null;
  }

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
