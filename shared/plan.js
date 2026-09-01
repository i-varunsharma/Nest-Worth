/*
  This file holds all the MATH for Nestworth. No React, no styling, just numbers.

  Keeping the maths in its own file means you can read and change the rules here
  without touching any of the page layout, and the same rules can be reused by
  every part of the site.
*/


/*
  The long-run return we assume the market pays, used in two places:

    the projection, to work out what a monthly investment grows into
    buildPlan, to decide whether a debt is worth clearing before investing

  Keeping it as one number means those two can never quietly disagree, which
  they would if the projection assumed 11% while the advice assumed 12%.
*/
export const ASSUMED_YEARLY_RETURN = 0.11;


/*
  Reads one bucket's rupee amount out of a plan.

    bucketAmount(plan, 'save')  ->  8500

  The dashboard and the check-in page both need this, and both used to walk the
  bucket list themselves. Returns 0 when there is no plan yet, which is what
  those pages want while they are still loading.
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

  formatRupees(62000)                     ->  "₹62,000"
  formatRupees(1380000, { short: true })  ->  "₹13.8 L"
  formatRupees(-850000, { short: true })  ->  "-₹8.5 L"

  The "short" option is for big numbers, where lakhs and crores are easier to
  read than a long row of digits.

  Negative amounts matter here more than they look. Net worth is often negative
  early on, when somebody has an education loan and has not saved yet, and the
  dashboard shows that number in a large display font sized for "₹8.5 L". The
  size test below therefore works on the size of the number, ignoring its sign,
  and the minus is added back at the end. Testing the signed value instead would
  quietly skip the short form for every negative amount and overflow the card.
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

  // Missing counts as steady, so a caller written before this existed still
  // gets a sensible plan rather than an undefined creeping into the maths.
  const incomeVaries = household.incomeVaries === true;

  /*
    Rent, food, transport and bills. Zero when the question has not been
    answered, which is how this behaved before it was asked at all.

    This matters more than any other adjustment in the file. Without it the
    model treats a Mumbai rent and a small town rent as the same, and asks a
    household paying 35,000 to live on the same share as one paying 8,000.
  */
  let essentialCosts = 0;
  if (Number.isFinite(household.essentialCosts) && household.essentialCosts > 0) {
    essentialCosts = Math.round(household.essentialCosts);
  }

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

  /*
    Whatever survives is the money the person can actually decide about.

    Essential costs come out here, alongside the household support and the EMI,
    because they are the same kind of money: it is gone before any choice is
    made. That changes what the "spend" bucket below means. It is no longer all
    spending, it is the discretionary part, the eating out and the trips and the
    things that could stop next month if they had to.

    Splitting a percentage off income without doing this is what makes budget
    apps feel written for somebody else. A plan that tells you to keep 48% when
    your rent alone is 30% is not ambitious, it is arithmetic that has not met
    you.
  */
  let free = income - support - emi - essentialCosts;
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

  /*
    An income that changes month to month needs a wider buffer.

    The money comes out of investing rather than spending, and it goes to
    saving. That is deliberate: a freelancer's problem is not that they spend
    too much in a good month, it is that a thin month arrives with nothing set
    aside and the shortfall goes on a credit card at 40%. Cash that is sitting
    there when that happens is worth far more than the few percent it would
    have earned invested.

    It is a smaller shift than the one a loan causes, because a variable income
    is a reason to hold more cash, not a reason to stop building anything.
  */
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
    While a loan is running, money usually moves out of investing and towards
    clearing it. Paying off a loan at 11% is a guaranteed 11% return, and no
    fund guarantees anything.

    That stops being true once the loan is cheap. A home loan at 8.4% costs less
    than the market has paid over long periods, so rushing to clear it while
    skipping the investing years is the more expensive mistake. When we know the
    real rate and it is below what we assume the market pays, we leave the
    investing share alone.

    When the rate is unknown, which is the case on the landing page before
    anybody has entered a real debt, we assume the expensive case. Guessing
    wrong in that direction only costs somebody a little growth; guessing wrong
    the other way tells them to invest through a credit card at 42%.
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
    Turn the three adjusted numbers into shares that add up to exactly 100.

    The order here matters, and getting it wrong was a real bug. Scaling to 100
    changes every number, so a limit applied BEFORE the scaling does not survive
    it: a household on a low income with a loan and a variable income came out
    with invest at 7%, under the 8% floor that was supposed to be guaranteed.

    So scale first, then apply the limits, and let spend take whatever is left.
    Spend is the right one to leave until last because it is the residual: save
    and invest are the two the plan is protecting, and spend is the money that
    remains once they have been.
  */
  const currentTotal = spendPercent + savePercent + investPercent;

  savePercent = keepBetween(Math.round((savePercent / currentTotal) * 100), 18, 48);
  investPercent = keepBetween(Math.round((investPercent / currentTotal) * 100), 8, 40);

  // Guaranteed to make the three add up to 100, because it is the remainder.
  spendPercent = keepBetween(100 - savePercent - investPercent, 34, 68);

  /*
    Rounding and the spend limit can together leave the total a point or two off
    100. Give the difference to saving, which has the widest room to take it.
  */
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
  Picks the one thing that matters most about this household and writes it
  out as a sentence. The order of these checks IS the priority order:
  a running loan beats everything, then dependents, then income.

  "tone" is only used to pick a colour later on. 'clay' is a warning,
  'brass' is a note, 'accent' is good news.
*/
function writeReasoning(facts) {
  /*
    A loan that costs less than the market pays does not get cleared first.

    This is the one place the usual advice flips, so it is worth saying out
    loud rather than quietly producing different percentages. Somebody with a
    home loan at 8.4% who has been told all their life to clear debt first
    deserves to know why we are telling them something else.
  */
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

  /*
    Said only when there is no debt competing for the same sentence. Somebody
    with a credit card at 42% and a variable income needs to hear about the
    card first, and the wider buffer is already in their numbers either way.
  */
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
