/*
  plan.js
  --------
  This file holds all the MATH for Nestworth. No React, no styling, just numbers.

  Keeping the maths in its own file means you can read and change the rules here
  without touching any of the page layout, and the same rules can be reused by
  every part of the site.
*/


/*
  Keeps a number inside a range.
  keepBetween(70, 10, 50) gives back 50, because 70 is above the highest value.
*/
function keepBetween(value, lowest, highest) {
  if (value < lowest) {
    return lowest;
  }
  if (value > highest) {
    return highest;
  }
  return value;
}


/*
  Rounds a number to the nearest 500, so the demo shows tidy figures
  like 15,000 instead of 14,880.
*/
function roundToNearest500(value) {
  return Math.round(value / 500) * 500;
}


/*
  Turns a plain number into a rupee string.

  formatRupees(62000)                    ->  "₹62,000"
  formatRupees(1380000, { short: true }) ->  "₹13.8 L"

  The "short" option is for big numbers, where lakhs and crores are easier
  to read than a long row of digits.
*/
export function formatRupees(value, options) {
  const amount = Math.round(value);

  // "options" is optional, so it may be undefined. Check carefully before using it.
  let useShortForm = false;
  if (options && options.short === true) {
    useShortForm = true;
  }

  if (useShortForm === true && amount >= 10000000) {
    const crores = amount / 10000000;
    return '₹' + crores.toFixed(2) + ' Cr';
  }

  if (useShortForm === true && amount >= 100000) {
    const lakhs = amount / 100000;
    return '₹' + lakhs.toFixed(1) + ' L';
  }

  // toLocaleString('en-IN') adds Indian-style commas: 6200000 becomes 62,00,000
  return '₹' + amount.toLocaleString('en-IN');
}


/*
  The heart of the product.

  You pass in a household:
    income      - monthly take-home pay, a number like 62000
    dependents  - how many people this salary supports, 0 to 3
    hasLoan     - true or false, is an education loan still running

  You get back a full plan: what leaves the account, what is left,
  how the leftover should be split, and a sentence explaining why.
*/
export function buildPlan(household) {
  const income = household.income;
  const dependents = household.dependents;
  const hasLoan = household.hasLoan;

  // ---------------------------------------------------------------
  // Step 1: work out the money that leaves before it is really yours.
  // ---------------------------------------------------------------

  // We assume each dependent costs about 12% of income, capped at 34% in total
  // so that a large family never eats the entire salary in this demo.
  let supportPercent = dependents * 0.12;
  if (supportPercent > 0.34) {
    supportPercent = 0.34;
  }
  const support = roundToNearest500(income * supportPercent);

  /*
    The EMI.

    If the caller knows the real figure, it passes it in and we use it. That is
    what happens once somebody has entered their actual debts, and it makes the
    whole plan real rather than illustrative.

    If not, we estimate: a typical education loan EMI is around 15% of income,
    capped at 24,000. The landing page demo uses this, because a visitor has not
    told us anything real yet.
  */
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

  // Whatever survives those two is the money the person can actually decide about.
  let free = income - support - emi;
  if (free < 0) {
    free = 0;
  }

  // ---------------------------------------------------------------
  // Step 2: split the leftover money three ways.
  // We start from a sensible default and then nudge it for this situation.
  // ---------------------------------------------------------------

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

  // Supporting several people leaves less room to take risk.
  if (dependents >= 2) {
    spendPercent = spendPercent + 4;
    savePercent = savePercent - 1;
    investPercent = investPercent - 3;
  }

  // While a loan is running, money moves out of investing and towards clearing it.
  if (hasLoan === true) {
    savePercent = savePercent + 7;
    investPercent = investPercent - 7;
  }

  // Stop any single share from becoming silly after all those adjustments.
  spendPercent = keepBetween(spendPercent, 34, 68);
  savePercent = keepBetween(savePercent, 18, 48);
  investPercent = keepBetween(investPercent, 8, 40);

  // The three shares must add up to exactly 100, so scale them to a total of 100.
  const currentTotal = spendPercent + savePercent + investPercent;
  spendPercent = Math.round((spendPercent / currentTotal) * 100);
  savePercent = Math.round((savePercent / currentTotal) * 100);
  investPercent = 100 - spendPercent - savePercent;

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
  });

  return {
    income: income,
    support: support,
    emi: emi,
    free: free,
    buckets: buckets,
    reasoning: reasoning,
  };
}


/*
  Picks the one thing that matters most about this household and writes it
  out as a sentence. The order of these checks IS the priority order:
  a running loan beats everything, then dependents, then income.

  "tone" is only used to pick a colour later on. 'clay' is a warning,
  'brass' is a note, 'accent' is good news.
*/
function writeReasoning(facts) {
  if (facts.hasLoan === true) {
    /*
      Name the real debt when we know it.

      This matters more than it looks. "Your education loan charges 11%" is
      wrong and unhelpful for somebody whose worst debt is a card at 42%, and
      being confidently wrong about the thing costing them the most is the
      fastest way to lose their trust.
    */
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


/* The return rate we assume everywhere, kept in one place so it is easy to change. */
export const ASSUMED_YEARLY_RETURN = 0.11;


/*
  Works out what a monthly investment grows into.

  This is the standard SIP (monthly investment) formula. In plain English:
  every month you add some money, and everything already in the pot grows a little,
  so the pot grows faster and faster the longer you leave it alone.

  monthly - rupees invested each month
  years   - how long the money is left alone
*/
export function projectInvestment(monthly, years) {
  if (monthly <= 0) {
    return 0;
  }

  const monthlyRate = ASSUMED_YEARLY_RETURN / 12;
  const numberOfMonths = years * 12;

  const growthFactor = Math.pow(1 + monthlyRate, numberOfMonths);
  return monthly * ((growthFactor - 1) / monthlyRate) * (1 + monthlyRate);
}


/*
  Builds one row per year, from year 0 up to the final year.
  The chart uses this list to draw its two lines.

  Each row looks like: { year: 5, invested: 180000, value: 238000 }
*/
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
