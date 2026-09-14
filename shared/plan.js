/*
  The recommendation model: how a household's income should be split, and the
  helpers for formatting and projecting money. Pure functions with no React or
  database, shared by the browser and the server.
*/


// The long-run yearly return assumed for the market. One constant, so the
// projection and the debt-versus-invest decision can never use different figures.
export const ASSUMED_YEARLY_RETURN = 0.11;


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


// keepBetween(70, 10, 50) returns 50.
function keepBetween(value, lowest, highest) {
  if (value < lowest) {
    return lowest;
  }
  if (value > highest) {
    return highest;
  }
  return value;
}


// Rounds to the nearest 500, so estimates read like 15,000 rather than 14,880.
function roundToNearest500(value) {
  return Math.round(value / 500) * 500;
}


/*
  A number as rupees, in the Indian style.

    formatRupees(62000)                     ->  "₹62,000"
    formatRupees(1380000, { short: true })  ->  "₹13.8 L"
    formatRupees(-850000, { short: true })  ->  "-₹8.5 L"

  The short-form test uses the size of the number without its sign, so negative
  net worth also gets the short form and fits its card.
*/
export function formatRupees(value, options) {
  // Nothing sensible can be printed for these. Showing "₹NaN" on a page looks
  // broken, so a dash says "no number" without pretending to have one.
  if (!Number.isFinite(value)) {
    return '₹—';
  }

  const amount = Math.round(value);

  // The size of the number, without its sign.
  const size = Math.abs(amount);

  let sign = '';
  if (amount < 0) {
    sign = '-';
  }

  // "options" is optional, so it may be undefined. Check carefully before using it.
  let useShortForm = false;
  if (options && options.short === true) {
    useShortForm = true;
  }

  if (useShortForm === true && size >= 10000000) {
    const crores = size / 10000000;
    return sign + '₹' + crores.toFixed(2) + ' Cr';
  }

  if (useShortForm === true && size >= 100000) {
    const lakhs = size / 100000;
    return sign + '₹' + lakhs.toFixed(1) + ' L';
  }

  // toLocaleString('en-IN') adds Indian-style commas: 6200000 becomes 62,00,000
  return sign + '₹' + size.toLocaleString('en-IN');
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

  Returns { income, support, emi, essentialCosts, free, buckets, reasoning }.
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

  // ---------------------------------------------------------------
  // Step 1: work out the money that leaves before it is really yours.
  // ---------------------------------------------------------------

  // With no real figure we assume each dependent costs about 12% of income,
  // capped at 34% in total so a large family never eats the entire salary.
  let supportPercent = dependents * 0.12;
  if (supportPercent > 0.34) {
    supportPercent = 0.34;
  }
  let support = roundToNearest500(income * supportPercent);

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

  // The real total EMI when debts are entered. Otherwise, on the landing page
  // demo, an estimate of 15% of income capped at ₹24,000.
  let emi = 0;
  if (hasLoan === true) {
    if (Number.isFinite(household.emi) && household.emi > 0) {
      emi = Math.round(household.emi);
    } else {
      let emiAmount = income * 0.15;
      if (emiAmount > 24000) {
        emiAmount = 24000;
      }
      emi = roundToNearest500(emiAmount);
    }
  }

  // What is left after support, EMIs and essentials is the money the person can
  // actually decide about. "Spend" below is therefore only the discretionary part.
  let free = income - support - emi - essentialCosts;
  if (free < 0) {
    free = 0;
  }

  // Step 2: split what is left, starting from defaults and adjusting for this household.

  let spendPercent = 52;
  let savePercent = 30;
  let investPercent = 18;

  // A bigger income means fixed costs take a smaller share, so more can be invested.
  if (income >= 150000) {
    spendPercent = spendPercent - 11;
    savePercent = savePercent + 3;
    investPercent = investPercent + 8;
  } else if (income >= 80000) {
    spendPercent = spendPercent - 6;
    savePercent = savePercent + 2;
    investPercent = investPercent + 4;
  } else if (income <= 35000) {
    spendPercent = spendPercent + 5;
    savePercent = savePercent - 2;
    investPercent = investPercent - 3;
  }

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
    A running loan moves money from investing to saving, because clearing debt at
    11% is a guaranteed return. Not when the loan is cheaper than the assumed market
    return (a home loan at 8.4%): then investing is kept. When the rate is unknown the
    expensive case is assumed, the safer mistake.
  */
  const marketReturnPercent = ASSUMED_YEARLY_RETURN * 100;

  let debtCostsMoreThanMarket = true;

  if (Number.isFinite(household.topRate)) {
    debtCostsMoreThanMarket = household.topRate >= marketReturnPercent;
  }

  if (hasLoan === true && debtCostsMoreThanMarket === true) {
    savePercent = savePercent + 7;
    investPercent = investPercent - 7;
  }

  /*
    Scale the three shares to 100 first, then apply the limits, and let spend take
    the remainder. Applying limits before scaling was a real bug: invest fell to 7%,
    below its 8% floor.
  */
  const currentTotal = spendPercent + savePercent + investPercent;

  savePercent = keepBetween(Math.round((savePercent / currentTotal) * 100), 18, 48);
  investPercent = keepBetween(Math.round((investPercent / currentTotal) * 100), 8, 40);

  // Guaranteed to make the three add up to 100, because it is the remainder.
  spendPercent = keepBetween(100 - savePercent - investPercent, 34, 68);

  // Rounding can leave the total a point off 100. Saving takes the difference.
  const drift = 100 - (spendPercent + savePercent + investPercent);
  savePercent = savePercent + drift;

  // ---------------------------------------------------------------
  // Step 3: turn the percentages into actual rupee amounts.
  // ---------------------------------------------------------------

  const buckets = [
    {
      key: 'spend',
      label: 'Spend',
      percent: spendPercent,
      amount: Math.round((free * spendPercent) / 100),
    },
    {
      key: 'save',
      label: 'Save',
      percent: savePercent,
      amount: Math.round((free * savePercent) / 100),
    },
    {
      key: 'invest',
      label: 'Invest',
      percent: investPercent,
      amount: Math.round((free * investPercent) / 100),
    },
  ];

  const reasoning = writeReasoning({
    income: income,
    dependents: dependents,
    hasLoan: hasLoan,
    support: support,
    emi: emi,
    free: free,
    investPercent: investPercent,

    // The most expensive debt, when the caller knows it. The dashboard passes
    // these in from the real debts list; the landing page demo does not have
    // them, so the sentence falls back to a general one.
    topRate: household.topRate,
    topDebtName: household.topDebtName,

    // Which side of the market return this person's worst debt sits on.
    debtCostsMoreThanMarket: debtCostsMoreThanMarket,
    marketReturnPercent: marketReturnPercent,

    incomeVaries: incomeVaries,
    savePercent: savePercent,
  });

  return {
    income: income,
    support: support,
    emi: emi,
    essentialCosts: essentialCosts,
    free: free,
    buckets: buckets,
    reasoning: reasoning,
  };
}


/*
  The one sentence explaining the plan. The order of the checks is the priority:
  a running loan first, then a variable income, then dependents, then income.
  tone picks the colour: 'clay' warning, 'brass' note, 'accent' good news.
*/
function writeReasoning(facts) {
  // A loan cheaper than the market return is not cleared first. This is where the
  // usual advice flips, so the sentence says why.
  if (facts.hasLoan === true && facts.debtCostsMoreThanMarket === false) {
    return {
      tone: 'accent',
      label: 'Worth knowing',
      text:
        'Your ' + facts.topDebtName + ' charges ' + facts.topRate + '%, which is less than the '
        + facts.marketReturnPercent + '% the market has paid over long periods. Clearing it early '
        + 'is not the cheapest move, so we keep investing at ' + facts.investPercent
        + '% and let the EMI run its course.',
    };
  }

  if (facts.hasLoan === true) {
    // Names the real worst debt when it is known, so a 42% card is not described as
    // an 11% education loan.
    if (facts.topDebtName && Number.isFinite(facts.topRate)) {
      return {
        tone: 'clay',
        label: 'First priority',
        text:
          'Your ' + facts.topDebtName + ' charges ' + facts.topRate + '%, more than the market '
          + 'reliably pays. We hold investing at ' + facts.investPercent + '% and send '
          + formatRupees(facts.emi) + ' a month at your debts, clearing that one first.',
      };
    }

    return {
      tone: 'clay',
      label: 'First priority',
      text:
        'An education loan compounds at roughly 11%, faster than the market pays you. '
        + 'We hold investing at ' + facts.investPercent + '% and route '
        + formatRupees(facts.emi) + ' a month at the loan until it is gone.',
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


// What a monthly investment (SIP) grows into after some years, using the
// standard formula with ASSUMED_YEARLY_RETURN.
export function projectInvestment(monthly, years) {
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
