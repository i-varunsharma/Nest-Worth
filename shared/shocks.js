import { bucketAmount, formatRupees } from './plan.js';

/*
  The stress test: what happens to this household's cash when something goes
  wrong.

  Most apps show a plan for a normal month. For a family living on one salary,
  the months that matter are the bad ones. This walks the cash forward month by
  month through one shock and reports when it runs out, if it does, and how much
  more would need to be put by for it not to.

  A shock looks like:
    { type: 'job_loss', months: 4 }
    { type: 'income_cut', percent: 30, months: 6 }
    { type: 'medical', amount: 300000 }
    { type: 'family_support', extraPerMonth: 12000, months: 6 }

  Everything is worked out from summariseFinances in finances.js, so the stress
  test uses the same plan, costs and savings as every other page.
*/


// How far forward to walk. A year is long enough to see a recovery and short
// enough for the assumptions to still mean something.
export const HORIZON_MONTHS = 12;

// During a crisis, everyday spending is assumed to halve: meals out and trips
// stop, which is what most families really do.
export const CRISIS_SPEND_SHARE = 0.5;

// With health cover, the family is assumed to pay this share of a hospital bill
// themselves: room rent limits, co-pay and things the policy excludes.
export const OUT_OF_POCKET_WITH_COVER = 0.2;

// Limits on what a shock can ask for. Anything outside is pulled back in, so a
// bad value from a slider or the AI cannot break the walk.
const MAX_SHOCK_MONTHS = 12;
const MIN_CUT_PERCENT = 5;
const MAX_CUT_PERCENT = 90;
const MAX_AMOUNT = 100000000;

// The defaults used for the four standard shocks on the dashboard.
const DEFAULT_JOB_LOSS_MONTHS = 4;
const DEFAULT_CUT_PERCENT = 30;
const DEFAULT_CUT_MONTHS = 6;
const DEFAULT_MEDICAL_BILL = 300000;
const DEFAULT_FAMILY_MONTHS = 6;
const DEFAULT_FAMILY_SHARE_OF_INCOME = 0.2;

export const SHOCK_TYPES = ['job_loss', 'income_cut', 'medical', 'family_support'];


/* Keeps a number inside a range, and turns anything that is not a number into the lowest value. */
function keepBetween(value, lowest, highest) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return lowest;
  }
  if (number < lowest) {
    return lowest;
  }
  if (number > highest) {
    return highest;
  }
  return number;
}


/* Rounds to the nearest 500, so suggested amounts read like amounts people use. */
function roundToNearest500(value) {
  return Math.round(value / 500) * 500;
}


/*
  Cleans a shock up before it is used: known type, whole months, sane amounts.
  Returns null for a type this file does not know.
*/
export function normaliseShock(shock) {
  if (!shock || SHOCK_TYPES.includes(shock.type) === false) {
    return null;
  }

  if (shock.type === 'job_loss') {
    return {
      type: 'job_loss',
      months: Math.round(keepBetween(shock.months, 1, MAX_SHOCK_MONTHS)),
    };
  }

  if (shock.type === 'income_cut') {
    return {
      type: 'income_cut',
      percent: Math.round(keepBetween(shock.percent, MIN_CUT_PERCENT, MAX_CUT_PERCENT)),
      months: Math.round(keepBetween(shock.months, 1, MAX_SHOCK_MONTHS)),
    };
  }

  if (shock.type === 'medical') {
    return {
      type: 'medical',
      amount: Math.round(keepBetween(shock.amount, 0, MAX_AMOUNT)),
    };
  }

  return {
    type: 'family_support',
    extraPerMonth: Math.round(keepBetween(shock.extraPerMonth, 0, MAX_AMOUNT)),
    months: Math.round(keepBetween(shock.months, 1, MAX_SHOCK_MONTHS)),
  };
}


/*
  The four shocks every household is tested against, sized for this household.
  The family one scales with income, because ₹12,000 a month is a crisis on one
  salary and a rounding error on another.
*/
export function standardShocks(finances) {
  let familyExtra = roundToNearest500(finances.plan.income * DEFAULT_FAMILY_SHARE_OF_INCOME);
  if (familyExtra < 1000) {
    familyExtra = 1000;
  }

  return [
    { type: 'job_loss', months: DEFAULT_JOB_LOSS_MONTHS },
    { type: 'income_cut', percent: DEFAULT_CUT_PERCENT, months: DEFAULT_CUT_MONTHS },
    { type: 'medical', amount: DEFAULT_MEDICAL_BILL },
    { type: 'family_support', extraPerMonth: familyExtra, months: DEFAULT_FAMILY_MONTHS },
  ];
}


/*
  Who a hospital bill is for, and how much of it the family pays.

  The first person listed without health cover is the one at risk. If everybody
  listed has cover, the bill is still tested, at the out-of-pocket share.
*/
function medicalDetails(amount, family) {
  for (const member of family) {
    if (member.hasHealthCover !== true) {
      return { personName: member.name, isCovered: false, outOfPocket: amount };
    }
  }

  if (family.length > 0) {
    return {
      personName: family[0].name,
      isCovered: true,
      outOfPocket: Math.round(amount * OUT_OF_POCKET_WITH_COVER),
    };
  }

  // Nobody listed, so nothing is known about cover. Assume none.
  return { personName: '', isCovered: false, outOfPocket: amount };
}


/* One sentence saying what the shock is, used by the page and by the AI coach. */
function describeShock(shock, finances, medical) {
  if (shock.type === 'job_loss') {
    if (finances.incomeVaries === true) {
      return 'Work dries up completely for ' + shock.months + ' months.';
    }
    return 'Your income stops for ' + shock.months + ' months.';
  }

  if (shock.type === 'income_cut') {
    return 'Your income falls by ' + shock.percent + '% for ' + shock.months + ' months.';
  }

  if (shock.type === 'medical') {
    let who = 'someone in your family';
    if (medical.personName !== '') {
      who = medical.personName;
    }

    if (medical.isCovered === true) {
      return 'A ' + formatRupees(shock.amount) + ' hospital bill for ' + who
        + '. Their cover pays most of it; you pay about ' + formatRupees(medical.outOfPocket) + '.';
    }

    return 'A ' + formatRupees(shock.amount) + ' hospital bill for ' + who + ', with no health cover.';
  }

  return 'Someone in your family needs ' + formatRupees(shock.extraPerMonth)
    + ' more a month for ' + shock.months + ' months.';
}


/* A short name for the shock, for headings and the dashboard list. */
export function shockTitle(type) {
  if (type === 'job_loss') {
    return 'Income stops';
  }
  if (type === 'income_cut') {
    return 'Income falls';
  }
  if (type === 'medical') {
    return 'Hospital bill';
  }
  return 'Family needs more';
}


/*
  Walks the cash forward through one shock.

    finances  the result of summariseFinances
    family    the family list, for the hospital bill
    shock     one of the shapes at the top of this file

  Each month is one of two kinds.

  A normal month follows the plan: income comes in, costs, spending and
  investing go out, and whatever is left stays as cash.

  A crisis month cuts back: investing pauses, extra debt payments pause (the
  EMI does not), everyday spending halves, and the shock itself is applied.

  Returns null for an unknown shock type.
*/
export function runShock(options) {
  const finances = options.finances;
  const family = options.family;
  const shock = normaliseShock(options.shock);

  if (shock === null) {
    return null;
  }

  const plan = finances.plan;
  const income = plan.income;
  const fixedCosts = plan.essentialCosts + plan.support;
  const spend = bucketAmount(plan, 'spend');
  const invest = bucketAmount(plan, 'invest');

  // The EMI the lender actually requires. The chosen plan may add extra on top,
  // and that extra is the first thing to stop in a crisis.
  const requiredEmi = finances.recommendedPlan.emi;

  let medical = null;
  if (shock.type === 'medical') {
    medical = medicalDetails(shock.amount, family);
  }

  const startCash = Math.round(finances.netWorth.liquidAssets);

  let cash = startCash;
  let lowestCash = startCash;
  let lowestMonth = 0;
  let runsOutMonth = null;

  const rows = [{ month: 0, cash: startCash, isCrisis: false }];

  for (let month = 1; month <= HORIZON_MONTHS; month = month + 1) {
    let isCrisis = false;
    let incomeThisMonth = income;
    let extraCost = 0;

    if (shock.type === 'job_loss' && month <= shock.months) {
      isCrisis = true;
      incomeThisMonth = 0;
    }

    if (shock.type === 'income_cut' && month <= shock.months) {
      isCrisis = true;
      incomeThisMonth = income * (1 - shock.percent / 100);
    }

    if (shock.type === 'medical' && month === 1) {
      isCrisis = true;
      extraCost = medical.outOfPocket;
    }

    if (shock.type === 'family_support' && month <= shock.months) {
      isCrisis = true;
      extraCost = shock.extraPerMonth;
    }

    let change = 0;

    if (isCrisis === true) {
      change = incomeThisMonth - fixedCosts - requiredEmi - spend * CRISIS_SPEND_SHARE - extraCost;
    } else {
      change = incomeThisMonth - fixedCosts - plan.emi - spend - invest;
    }

    cash = cash + change;

    if (cash < lowestCash) {
      lowestCash = cash;
      lowestMonth = month;
    }

    if (runsOutMonth === null && cash < 0) {
      runsOutMonth = month;
    }

    rows.push({ month: month, cash: Math.round(cash), isCrisis: isCrisis });
  }

  lowestCash = Math.round(lowestCash);

  /*
    Three verdicts.
      breaks  the cash goes below zero at some point
      tight   it survives, but the lowest point is under one month of costs
      safe    there is still at least a month of costs left at the worst point
  */
  let verdict = 'safe';

  if (runsOutMonth !== null) {
    verdict = 'breaks';
  } else if (lowestCash < finances.monthlyCosts) {
    verdict = 'tight';
  }

  // What would have to be put by today for the cash never to go below zero.
  // Rounded UP to the next 500. Rounding to the nearest could round down and
  // leave the advice a few rupees short of enough.
  let shortfall = 0;
  if (lowestCash < 0) {
    shortfall = Math.ceil(-lowestCash / 500) * 500;
  }

  // How long the plan's own saving would take to build that buffer.
  const monthlySave = bucketAmount(plan, 'save');

  let monthsToFix = null;
  if (shortfall > 0 && monthlySave > 0) {
    monthsToFix = Math.ceil(shortfall / monthlySave);
  }

  let outOfPocket = null;
  if (medical !== null) {
    outOfPocket = medical.outOfPocket;
  }

  return {
    shock: shock,
    title: shockTitle(shock.type),
    description: describeShock(shock, finances, medical),
    rows: rows,
    startCash: startCash,
    lowestCash: lowestCash,
    lowestMonth: lowestMonth,
    runsOutMonth: runsOutMonth,
    endCash: rows[rows.length - 1].cash,
    verdict: verdict,
    shortfall: shortfall,
    monthsToFix: monthsToFix,
    outOfPocket: outOfPocket,
  };
}


/* The result in one plain sentence. */
export function verdictSentence(result) {
  if (result.verdict === 'breaks') {
    let sentence = 'Your cash runs out in month ' + result.runsOutMonth
      + '. You would need ' + formatRupees(result.shortfall) + ' more put by to get through it.';

    if (result.monthsToFix !== null) {
      sentence = sentence + ' At your current saving that takes ' + result.monthsToFix + ' months.';
    }

    return sentence;
  }

  if (result.verdict === 'tight') {
    return 'You get through it, but only just: at the lowest point there is '
      + formatRupees(result.lowestCash) + ' left, less than one month of costs.';
  }

  return 'You get through it with ' + formatRupees(result.lowestCash)
    + ' still in hand at the lowest point.';
}


/*
  Runs the four standard shocks and counts how many the household survives.
  A tight result counts as surviving, because the cash never ran out.
*/
export function runStandardShocks(options) {
  const finances = options.finances;
  const family = options.family;

  const results = [];
  let survivedCount = 0;

  standardShocks(finances).forEach((shock) => {
    const result = runShock({ finances: finances, family: family, shock: shock });

    if (result.verdict !== 'breaks') {
      survivedCount = survivedCount + 1;
    }

    results.push(result);
  });

  return {
    results: results,
    survivedCount: survivedCount,
    total: results.length,
  };
}
