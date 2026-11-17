import { formatRupees } from './format.js';
import { keepBetween } from './numbers.js';

/*
  The recommendation model: how a household's income should be split, and what a
  monthly investment grows into. Pure functions with no React or database,
  shared by the browser and the server. Formatting money is in format.js.
*/


// The long-run yearly return assumed for the market. One constant, so the
// projection and the debt-versus-invest decision can never use different figures.
export const ASSUMED_YEARLY_RETURN = 0.11;

// Used to show what a future amount is worth in today's money.
export const ASSUMED_YEARLY_INFLATION = 0.06;

// Used only when the real figure is not known yet (the landing page demo, or
// onboarding before the family list is filled in). Fixed rupee amounts rather
// than a share of salary, because a parent's medicines do not cost more when
// your salary goes up, and an EMI is set by the loan, not by your pay.
export const DEFAULT_SUPPORT_PER_PERSON = 7500;
export const DEFAULT_EMI = 9500;

/*
  How the split shifts with income. Between two of these points the shift is
  blended in a straight line, so a ₹1,000 raise never makes the plan jump.
  The old version used hard steps, and at ₹1,50,000 a ₹1,000 raise cut the
  Spend amount by over ₹6,000.
*/
const INCOME_SHIFT_POINTS = [
  { income: 35000, spend: 5, save: -2, invest: -3 },
  { income: 80000, spend: -6, save: 2, invest: 4 },
  { income: 150000, spend: -11, save: 3, invest: 8 },
];

// The lowest and highest share each bucket may have, in percent.
const SHARE_LIMITS = {
  spend: { lowest: 34, highest: 68 },
  save: { lowest: 18, highest: 48 },
  invest: { lowest: 8, highest: 40 },
};


/*
  One bucket's amount from a plan, or 0 before a plan exists.

    bucketAmount(plan, 'save')  ->  8500
*/
export function bucketAmount(plan, key) {
  if (!plan) {
    return 0;
  }

  for (const bucket of plan.buckets) {
    if (bucket.key === key) {
      return bucket.amount;
    }
  }

  return 0;
}


/*
  Builds the recommended plan for a household.

    income        monthly take-home pay
    dependents    people the salary supports
    hasLoan       whether any debt is running
    essentialCosts, emi, topRate, topDebtName, incomeVaries   optional real figures
    supportCosts  optional real monthly total sent to family
    extraSupport  optional, added on top, for "what if" questions

  Pages and the server should use buildHouseholdPlan in shared/finances.js, which
  fills these in from stored data the same way everywhere.

  Returns { income, support, emi, essentialCosts, free, shortfall, buckets, reasoning }.
  shortfall is how much the fixed costs go over the income, 0 when they fit.
*/
export function buildPlan(household) {
  const income = household.income;
  const dependents = household.dependents;
  const hasLoan = household.hasLoan;

  // Missing counts as steady, so a caller written before this existed still
  // gets a sensible plan rather than an undefined creeping into the maths.
  const incomeVaries = household.incomeVaries === true;

  /*
    Rent, food, transport and bills. Taken off before the split, so a household
    paying ₹35,000 rent is not asked to keep the same share as one paying ₹8,000.
    0 when not answered.
  */
  let essentialCosts = 0;
  if (Number.isFinite(household.essentialCosts) && household.essentialCosts > 0) {
    essentialCosts = Math.round(household.essentialCosts);
  }

  // Step 1: work out the money that leaves before it is really yours.

  // With no real figure, each dependent is assumed to cost a fixed amount.
  let support = dependents * DEFAULT_SUPPORT_PER_PERSON;

  // Once the person has listed the family they support, the real total
  // replaces the guess. Zero is a real answer here, so only a missing value
  // falls back to the estimate.
  if (Number.isFinite(household.supportCosts) && household.supportCosts >= 0) {
    support = Math.round(household.supportCosts);
  }

  // Used by "what if" questions, such as a parent who starts needing help.
  // It adds to whichever support figure is in use, real or estimated.
  if (Number.isFinite(household.extraSupport) && household.extraSupport > 0) {
    support = support + Math.round(household.extraSupport);
  }

  // The real total EMI when debts are entered, otherwise the fixed default.
  let emi = 0;
  if (hasLoan === true) {
    if (Number.isFinite(household.emi) && household.emi > 0) {
      emi = Math.round(household.emi);
    } else {
      emi = DEFAULT_EMI;
    }
  }

  // What is left after support, EMIs and essentials is the money the person can
  // actually decide about. "Spend" below is therefore only the discretionary part.
  const leftOver = income - support - emi - essentialCosts;

  // When the fixed costs are bigger than the income, the gap is kept and shown,
  // rather than quietly turned into ₹0. Being short every month is the most
  // important thing the plan can tell someone.
  let free = leftOver;
  let shortfall = 0;
  if (leftOver < 0) {
    free = 0;
    shortfall = -leftOver;
  }

  // Step 2: split what is left, starting from defaults and adjusting for this household.

  // A bigger income means fixed costs take a smaller share, so more can be invested.
  const shift = incomeShift(income);

  let spendPercent = 52 + shift.spend;
  let savePercent = 30 + shift.save;
  let investPercent = 18 + shift.invest;

  // A variable income moves money from investing to saving. The risk for a
  // freelancer is a thin month with nothing set aside, which ends up on a credit card.
  if (incomeVaries === true) {
    savePercent = savePercent + 6;
    investPercent = investPercent - 6;
  }

  // Supporting several people leaves less room to take risk.
  if (dependents >= 2) {
    spendPercent = spendPercent + 4;
    savePercent = savePercent - 1;
    investPercent = investPercent - 3;
  }

  /*
    A running loan moves money from investing to saving, because paying off debt
    that costs more than the market pays is a guaranteed return. A loan at exactly
    the market return or below it (a home loan at 8.4%) is not rushed, so investing
    is kept. When the rate is unknown the expensive case is assumed, the safer mistake.
  */
  const marketReturnPercent = ASSUMED_YEARLY_RETURN * 100;

  let debtCostsMoreThanMarket = true;

  if (Number.isFinite(household.topRate)) {
    // Strictly more. A loan at 11% does not cost more than an 11% return.
    debtCostsMoreThanMarket = household.topRate > marketReturnPercent;
  }

  if (hasLoan === true && debtCostsMoreThanMarket === true) {
    savePercent = savePercent + 7;
    investPercent = investPercent - 7;
  }

  /*
    Scale the three shares to 100 first, then apply the limits, and let spend take
    the remainder. Applying limits before scaling was a real bug: invest fell to 7%,
    below its 8% floor.

    The shares are kept as exact decimals here. Rounding them to whole percents
    before working out the rupees made the amounts jump by up to 1% of the free
    money at a time.
  */
  const currentTotal = spendPercent + savePercent + investPercent;

  savePercent = keepBetween((savePercent / currentTotal) * 100, SHARE_LIMITS.save.lowest, SHARE_LIMITS.save.highest);
  investPercent = keepBetween((investPercent / currentTotal) * 100, SHARE_LIMITS.invest.lowest, SHARE_LIMITS.invest.highest);
  spendPercent = keepBetween(100 - savePercent - investPercent, SHARE_LIMITS.spend.lowest, SHARE_LIMITS.spend.highest);

  // If spend hit one of its limits the three may not add up to 100. Saving takes the difference.
  savePercent = 100 - spendPercent - investPercent;

  // Whole percents for the screen, chosen so they still add up to exactly 100.
  const shownPercents = roundToWholePercents([spendPercent, savePercent, investPercent]);

  // Step 3: turn the shares into actual rupee amounts.

  const buckets = [
    {
      key: 'spend',
      label: 'Spend',
      percent: shownPercents[0],
      amount: Math.round((free * spendPercent) / 100),
    },
    {
      key: 'save',
      label: 'Save',
      percent: shownPercents[1],
      amount: Math.round((free * savePercent) / 100),
    },
    {
      key: 'invest',
      label: 'Invest',
      percent: shownPercents[2],
      amount: Math.round((free * investPercent) / 100),
    },
  ];

  const reasoning = writeReasoning({
    income: income,
    dependents: dependents,
    hasLoan: hasLoan,
    support: support,
    emi: emi,
    essentialCosts: essentialCosts,
    free: free,
    shortfall: shortfall,
    investPercent: shownPercents[2],

    // The most expensive debt, when the caller knows it. The dashboard passes
    // these in from the real debts list; the landing page demo does not have
    // them, so the sentence falls back to a general one.
    topRate: household.topRate,
    topDebtName: household.topDebtName,

    // Which side of the market return this person's worst debt sits on.
    debtCostsMoreThanMarket: debtCostsMoreThanMarket,
    marketReturnPercent: marketReturnPercent,

    incomeVaries: incomeVaries,
    savePercent: shownPercents[1],
  });

  return {
    income: income,
    support: support,
    emi: emi,
    essentialCosts: essentialCosts,
    free: free,
    shortfall: shortfall,
    buckets: buckets,
    reasoning: reasoning,
  };
}


/*
  How much each bucket's share moves for this income, blended between the
  points in INCOME_SHIFT_POINTS. Below the first point and above the last one
  the shift stays flat.

    incomeShift(57500)  ->  halfway between the 35,000 and 80,000 shifts
*/
function incomeShift(income) {
  const first = INCOME_SHIFT_POINTS[0];
  const last = INCOME_SHIFT_POINTS[INCOME_SHIFT_POINTS.length - 1];

  if (income <= first.income) {
    return { spend: first.spend, save: first.save, invest: first.invest };
  }
  if (income >= last.income) {
    return { spend: last.spend, save: last.save, invest: last.invest };
  }

  // Find the two points the income sits between.
  for (let index = 0; index < INCOME_SHIFT_POINTS.length - 1; index = index + 1) {
    const lower = INCOME_SHIFT_POINTS[index];
    const upper = INCOME_SHIFT_POINTS[index + 1];

    if (income >= lower.income && income <= upper.income) {
      // 0 at the lower point, 1 at the upper point, in between otherwise.
      const progress = (income - lower.income) / (upper.income - lower.income);

      return {
        spend: lower.spend + (upper.spend - lower.spend) * progress,
        save: lower.save + (upper.save - lower.save) * progress,
        invest: lower.invest + (upper.invest - lower.invest) * progress,
      };
    }
  }

  // Not reachable, the checks above cover every income.
  return { spend: 0, save: 0, invest: 0 };
}


/*
  Rounds shares to whole percents that still add up to exactly 100.

  Rounding each one on its own can give 99 or 101. Instead every share is
  rounded down, and the points still missing go to the shares that lost the
  most in rounding down. Each result is then the share rounded down or up,
  never further away, so it can never cross a whole-number limit.

    roundToWholePercents([33.4, 33.3, 33.3])  ->  [34, 33, 33]
*/
function roundToWholePercents(shares) {
  const rounded = [];
  let total = 0;

  shares.forEach((share) => {
    const whole = Math.floor(share);
    rounded.push(whole);
    total = total + whole;
  });

  // Positions sorted by how much was cut off, biggest cut first.
  const positions = [0, 1, 2];
  positions.sort((first, second) => {
    const cutFromFirst = shares[first] - Math.floor(shares[first]);
    const cutFromSecond = shares[second] - Math.floor(shares[second]);
    return cutFromSecond - cutFromFirst;
  });

  let pointsMissing = 100 - total;
  let next = 0;
  while (pointsMissing > 0) {
    const position = positions[next];
    rounded[position] = rounded[position] + 1;
    pointsMissing = pointsMissing - 1;
    next = next + 1;
  }

  return rounded;
}


/*
  The one sentence explaining the plan. The order of the checks is the priority:
  a monthly shortfall first, then a running loan, then a variable income, then
  dependents, then income.
  tone picks the colour: 'clay' warning, 'brass' note, 'accent' good news.
*/
function writeReasoning(facts) {
  // Nothing else matters while the fixed costs are bigger than the income.
  if (facts.shortfall > 0) {
    return {
      tone: 'clay',
      label: 'Close the gap first',
      text:
        'Rent, support and EMIs come to '
        + formatRupees(facts.support + facts.emi + facts.essentialCosts) + ', which is '
        + formatRupees(facts.shortfall) + ' more than you take home. No split can fix that, '
        + 'so the first job is closing the gap: ' + biggestFixedCost(facts) + '.',
    };
  }

  // Added to the loan sentences, so turning on "income varies" still changes
  // the explanation while a loan is running.
  let variesNote = '';
  if (facts.incomeVaries === true) {
    variesNote = ' Your income moves as well, so a bigger share stays in Save as cash.';
  }

  // A loan cheaper than the market return is not cleared first. This is where the
  // usual advice flips, so the sentence says why.
  if (facts.hasLoan === true && facts.debtCostsMoreThanMarket === false) {
    let debtName = 'loan';
    if (facts.topDebtName) {
      debtName = facts.topDebtName;
    }

    return {
      tone: 'accent',
      label: 'Worth knowing',
      text:
        'Your ' + debtName + ' charges ' + facts.topRate + '%, which is not more than the '
        + facts.marketReturnPercent + '% the market has paid over long periods. Paying it off early '
        + 'is not the cheapest move, so we keep investing at ' + facts.investPercent
        + '% and let the ' + formatRupees(facts.emi) + ' EMI run its course.' + variesNote,
    };
  }

  if (facts.hasLoan === true) {
    // Names the real worst debt when it is known, so a 42% card is not described as
    // an education loan.
    let opening = 'We do not know your loan\'s rate yet, so we assume it costs more than the '
      + facts.marketReturnPercent + '% the market pays.';

    if (facts.topDebtName && Number.isFinite(facts.topRate)) {
      opening = 'Your ' + facts.topDebtName + ' charges ' + facts.topRate + '%, more than the '
        + facts.marketReturnPercent + '% the market has paid over long periods.';
    }

    return {
      tone: 'clay',
      label: 'First priority',
      text:
        opening + ' The ' + formatRupees(facts.emi) + ' EMI is already taken off above. '
        + 'Of what is left, Save gets the bigger share so you can prepay, and investing '
        + 'stays at ' + facts.investPercent + '% so the habit does not stop.' + variesNote,
    };
  }

  // Only when no debt needs the sentence more.
  if (facts.incomeVaries === true) {
    return {
      tone: 'brass',
      label: 'Built for a bumpy month',
      text:
        'Your income moves, so this plan holds more in cash than it otherwise would: '
        + facts.savePercent + '% to saving rather than investing. A thin month is a normal '
        + 'event on a variable income, and money you can reach is what stops it becoming a '
        + 'credit card balance.',
    };
  }

  if (facts.dependents >= 2) {
    return {
      tone: 'brass',
      label: 'What we noticed',
      text:
        formatRupees(facts.support) + ' of your income supports your household before you see it. '
        + 'Your plan is built on the ' + formatRupees(facts.free)
        + ' that is actually yours to direct, not on your CTC.',
    };
  }

  if (facts.dependents === 1) {
    return {
      tone: 'brass',
      label: 'What we noticed',
      text:
        'Supporting one person costs you ' + formatRupees(facts.support) + ' a month. '
        + 'That is a real commitment, so we protect it first and plan around the rest.',
    };
  }

  if (facts.income >= 150000) {
    return {
      tone: 'accent',
      label: 'Your opening',
      text:
        'Nothing is claimed on your income yet. This is the cheapest decade you will ever have '
        + 'to compound in, so ' + facts.investPercent
        + '% goes to investing while your costs are still low.',
    };
  }

  return {
    tone: 'accent',
    label: 'Your opening',
    text:
      'No dependents, no debt. Every rupee of the ' + formatRupees(facts.free)
      + ' you keep is yours to aim, and starting now is worth more than starting bigger later.',
  };
}


// Points at the biggest of the three fixed costs, for the shortfall sentence.
function biggestFixedCost(facts) {
  if (facts.essentialCosts >= facts.support && facts.essentialCosts >= facts.emi) {
    return 'rent, food and bills are the biggest line, at ' + formatRupees(facts.essentialCosts);
  }
  if (facts.support >= facts.emi) {
    return 'family support is the biggest line, at ' + formatRupees(facts.support)
      + ', so it may be worth talking through what is shared';
  }
  return 'EMIs are the biggest line, at ' + formatRupees(facts.emi)
    + ', so ask your lender about a longer term';
}


/*
  What an amount in the future is worth in today's money, after inflation.

    inTodaysMoney(569000, 15)  ->  about 2,37,000
*/
export function inTodaysMoney(futureValue, years) {
  return futureValue / Math.pow(1 + ASSUMED_YEARLY_INFLATION, years);
}


// What a monthly investment (SIP) grows into after some years, using the
// standard formula with ASSUMED_YEARLY_RETURN. Each month's amount is assumed
// to go in at the start of the month.
function projectInvestment(monthly, years) {
  if (monthly <= 0) {
    return 0;
  }

  const monthlyRate = ASSUMED_YEARLY_RETURN / 12;
  const numberOfMonths = years * 12;

  const growthFactor = Math.pow(1 + monthlyRate, numberOfMonths);
  return monthly * ((growthFactor - 1) / monthlyRate) * (1 + monthlyRate);
}


// One row per year for the projection chart: { year, invested, value }.
export function buildProjectionRows(monthly, years) {
  const rows = [];

  for (let year = 0; year <= years; year = year + 1) {
    rows.push({
      year: year,
      invested: monthly * 12 * year,
      value: projectInvestment(monthly, year),
    });
  }

  return rows;
}
