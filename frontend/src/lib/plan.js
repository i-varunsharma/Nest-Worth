/**
 * The recommendation model the landing page demos live.
 * Deliberately simple and readable — the point of the product is that every
 * number can be explained in a sentence, so the demo has to work the same way.
 */

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const defaultPlanState = { income: 62000, dependents: 2, hasLoan: true };

export function formatRupees(value, { compact = false } = {}) {
  const amount = Math.round(value);
  if (compact && amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (compact && amount >= 100000) return `₹${(amount / 100000).toFixed(1)} L`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function buildPlan({ income, dependents, hasLoan } = defaultPlanState) {
  // What leaves the account before it is ever really yours.
  const supportRate = Math.min(dependents * 0.12, 0.34);
  const support = Math.round((income * supportRate) / 500) * 500;
  const emi = hasLoan ? Math.round(Math.min(income * 0.15, 24000) / 500) * 500 : 0;
  const free = Math.max(income - support - emi, 0);

  // Allocation of what is genuinely left over.
  let spend = 52;
  let save = 30;
  let invest = 18;

  if (income >= 150000) { spend -= 11; save += 3; invest += 8; }
  else if (income >= 80000) { spend -= 6; save += 2; invest += 4; }
  else if (income <= 35000) { spend += 5; save -= 2; invest -= 3; }

  if (dependents >= 2) { spend += 4; invest -= 3; save -= 1; }
  if (hasLoan) { save += 7; invest -= 7; }

  spend = clamp(spend, 34, 68);
  save = clamp(save, 18, 48);
  invest = clamp(invest, 8, 40);

  const total = spend + save + invest;
  spend = Math.round((spend / total) * 100);
  save = Math.round((save / total) * 100);
  invest = 100 - spend - save;

  const buckets = [
    { key: 'spend', label: 'Spend', share: spend, amount: Math.round((free * spend) / 100) },
    { key: 'save', label: 'Save', share: save, amount: Math.round((free * save) / 100) },
    { key: 'invest', label: 'Invest', share: invest, amount: Math.round((free * invest) / 100) },
  ];

  return { income, support, emi, free, buckets, reasoning: explain({ income, dependents, hasLoan, support, emi, free, invest }) };
}

function explain({ income, dependents, hasLoan, support, emi, free, invest }) {
  if (hasLoan) {
    return {
      tone: 'clay',
      label: 'First priority',
      body: `Your education loan compounds at roughly 11% — faster than the market pays you. We hold investing at ${invest}% and route ${formatRupees(emi)} a month at the loan until it is gone.`,
    };
  }
  if (dependents >= 2) {
    return {
      tone: 'brass',
      label: 'What we noticed',
      body: `${formatRupees(support)} of your income supports your household before you see it. Your plan is built on the ${formatRupees(free)} that is actually yours to direct — not on your CTC.`,
    };
  }
  if (dependents === 1) {
    return {
      tone: 'brass',
      label: 'What we noticed',
      body: `Supporting one person costs you ${formatRupees(support)} a month. That is a real commitment, so we protect it first and plan around the rest.`,
    };
  }
  if (income >= 150000) {
    return {
      tone: 'accent',
      label: 'Your opening',
      body: `Nothing is claimed on your income yet. This is the cheapest decade you will ever have to compound in, so ${invest}% goes to investing while your costs are still low.`,
    };
  }
  return {
    tone: 'accent',
    label: 'Your opening',
    body: `No dependents, no debt. Every rupee of the ${formatRupees(free)} you keep is yours to aim, and starting now is worth more than starting bigger later.`,
  };
}

/** Monthly SIP future value at an 11% annual return. */
export function projectSip(monthly, years, annualRate = 0.11) {
  const r = annualRate / 12;
  const n = years * 12;
  if (monthly <= 0) return 0;
  return monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
}

export function projectionSeries(monthly, years, annualRate = 0.11) {
  return Array.from({ length: years + 1 }, (_, year) => ({
    year,
    invested: monthly * 12 * year,
    value: projectSip(monthly, year, annualRate),
  }));
}
