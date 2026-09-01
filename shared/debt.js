/*
  Everything to do with paying off a loan. No React, no styling, just numbers.

  The one idea behind this whole file:

    Every month, interest is added to what you owe, and then your EMI is taken
    off. Whatever is left is what you owe next month.

  That is it. Repeat until the balance reaches zero, counting the months as you
  go, and you have the payoff date. Add up the interest as you go, and you have
  the true cost of the loan. There is a closed-form formula for this, but
  stepping month by month is easier to read, easier to trust, and fast enough
  for a few hundred iterations.
*/


// A loan that never gets paid off would loop forever, so we stop after this
// many months and report that it does not clear. 600 months is 50 years.
const MAX_MONTHS = 600;


/*
  Works out how long a loan takes to clear, and what it costs in interest.

    principal  what is still owed today
    annualRate yearly interest as a percentage, so 11.2 means 11.2%
    emi        the fixed amount paid every month
    extra      optional additional amount paid every month on top of the EMI

  Returns:
    { clears, months, totalInterest, totalPaid, payoffDate }

  "clears" is false when the loan never finishes, and "reason" says which of the
  two ways it failed:

    'interest'  the payment is smaller than the interest, so the balance grows
                every month. Real for anybody paying a credit card minimum.
    'tooSlow'   the payment is larger than the interest, but only just, so the
                balance falls so slowly that it is still there after MAX_MONTHS.

  The second one is easy to miss. The balance does go down, so a naive loop
  looks like it is working, and it is only the fifty-year cap that stops it.
  Reporting it as cleared would print a confident payoff date for a loan
  somebody would still be paying in their eighties.
*/
export function payoff(principal, annualRate, emi, extra) {
  let extraPayment = 0;
  if (extra) {
    extraPayment = extra;
  }

  const monthlyPayment = emi + extraPayment;

  // Interest is quoted per year but charged per month.
  const monthlyRate = annualRate / 100 / 12;

  // Nothing owed means nothing to do.
  if (principal <= 0) {
    return { clears: true, months: 0, totalInterest: 0, totalPaid: 0, payoffDate: new Date() };
  }

  // The first month's interest. If the payment does not even cover this, the
  // balance goes up rather than down, and no amount of time will clear it.
  const firstMonthInterest = principal * monthlyRate;

  if (monthlyPayment <= firstMonthInterest) {
    return {
      clears: false,
      reason: 'interest',
      months: 0,
      totalInterest: 0,
      totalPaid: 0,
      payoffDate: null,

      // How much more per month it would take just to stand still.
      shortfall: firstMonthInterest - monthlyPayment,
    };
  }

  let balance = principal;
  let months = 0;
  let totalInterest = 0;
  let totalPaid = 0;

  while (balance > 0 && months < MAX_MONTHS) {
    const interestThisMonth = balance * monthlyRate;

    balance = balance + interestThisMonth;

    // The final payment is usually smaller than a full EMI, because there is
    // less left than the EMI. Paying the balance is enough.
    let payment = monthlyPayment;
    if (payment > balance) {
      payment = balance;
    }

    balance = balance - payment;

    totalInterest = totalInterest + interestThisMonth;
    totalPaid = totalPaid + payment;
    months = months + 1;
  }

  /*
    The loop can stop for two reasons: the balance reached zero, or we hit the
    cap. Only the first one is a loan that clears.

    Without this check the function would return months: 600 and a payoff date
    fifty years out, for a balance that has barely moved. It looks like an
    answer, which is what makes it worse than an error.
  */
  if (balance > 0) {
    return {
      clears: false,
      reason: 'tooSlow',
      months: 0,
      totalInterest: 0,
      totalPaid: 0,
      payoffDate: null,
      remainingAfterCap: balance,
    };
  }

  return {
    clears: true,
    months: months,
    totalInterest: totalInterest,
    totalPaid: totalPaid,
    payoffDate: monthsFromNow(months),
  };
}


/*
  Compares paying the EMI alone against paying a bit more every month.

  This is the number that changes behaviour. "Your loan costs 11%" is abstract.
  "Pay ₹3,000 more and you are free 14 months sooner and ₹48,900 better off" is
  a decision somebody can actually make.
*/
export function extraPaymentEffect(principal, annualRate, emi, extra) {
  const asIs = payoff(principal, annualRate, emi, 0);
  const withExtra = payoff(principal, annualRate, emi, extra);

  // The extra is not enough to make this debt finish, so there is no payoff
  // date to compare against and nothing honest to show.
  if (!withExtra.clears) {
    return { possible: false };
  }

  /*
    The debt does not clear on the EMI alone, but it does with the extra.

    This is the case that used to be thrown away, and it is the most important
    one on the page. A credit card whose minimum payment never clears it is
    exactly the debt where paying more changes everything, and the old version
    refused to say so no matter how far the slider moved.

    There is no "months saved" here, because the starting point is never. What
    can be said is that it now finishes, and when.
  */
  if (!asIs.clears) {
    return {
      possible: true,
      turnsAround: true,
      monthsSaved: 0,
      interestSaved: 0,
      newMonths: withExtra.months,
      newPayoffDate: withExtra.payoffDate,
      baseMonths: 0,
      baseInterest: 0,
    };
  }

  return {
    possible: true,
    turnsAround: false,
    monthsSaved: asIs.months - withExtra.months,
    interestSaved: asIs.totalInterest - withExtra.totalInterest,
    newMonths: withExtra.months,
    newPayoffDate: withExtra.payoffDate,
    baseMonths: asIs.months,
    baseInterest: asIs.totalInterest,
  };
}


/*
  Puts debts in the order they should be cleared: highest interest rate first.

  This is called the avalanche method, and it is simply the cheapest order.
  Every rupee has to go somewhere, and putting it against the most expensive
  debt saves the most interest, always.

  The popular alternative, the snowball method, clears the smallest balance
  first. It costs more but people stick with it more often, because an early win
  is motivating. Both are defensible. We use avalanche and show the reasoning,
  which is the promise the rest of the app makes too.

  slice() copies the list first, because sort() rearranges the original, and
  quietly reordering something you were handed is a rude thing for a function
  to do.
*/
export function orderByRate(debts) {
  return debts.slice().sort((a, b) => b.annualRate - a.annualRate);
}


/*
  Adds up several debts into one summary for the dashboard.

  "debtFreeDate" is the date the LAST debt clears, because that is the date the
  person actually cares about.
*/
export function summariseDebts(debts) {
  let totalOwed = 0;
  let totalEmi = 0;
  let totalInterest = 0;
  let longestMonths = 0;
  let everythingClears = true;
  let highestRate = 0;

  debts.forEach((debt) => {
    totalOwed = totalOwed + debt.principal;
    totalEmi = totalEmi + debt.emi;

    if (debt.annualRate > highestRate) {
      highestRate = debt.annualRate;
    }

    const result = payoff(debt.principal, debt.annualRate, debt.emi, 0);

    if (!result.clears) {
      everythingClears = false;
      return;
    }

    totalInterest = totalInterest + result.totalInterest;

    if (result.months > longestMonths) {
      longestMonths = result.months;
    }
  });

  let debtFreeDate = null;
  if (everythingClears === true && debts.length > 0) {
    debtFreeDate = monthsFromNow(longestMonths);
  }

  return {
    count: debts.length,
    totalOwed: totalOwed,
    totalEmi: totalEmi,
    totalInterest: totalInterest,
    longestMonths: longestMonths,
    everythingClears: everythingClears,
    highestRate: highestRate,
    debtFreeDate: debtFreeDate,
  };
}


/*
  A date this many months from today. Only the month and year are ever shown.

  The setDate(1) is not decoration. Adding one month to the 31st of May asks
  for the 31st of June, which does not exist, so JavaScript rolls it forward to
  the 1st of July and the answer is a month late. Run the app on the 31st and
  every payoff date on the page is wrong.

  Moving to the 1st of the month first means there is no day to roll over.
  setMonth still handles the year on its own, so month 14 from now becomes next
  year without any arithmetic here.
*/
export function monthsFromNow(months) {
  const date = new Date();

  date.setDate(1);
  date.setMonth(date.getMonth() + months);

  return date;
}


/* "March 2029", for showing a payoff date. */
export function formatMonthYear(date) {
  if (!date) {
    return '—';
  }

  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}


/*
  Turns a number of months into something a person would say out loud.
  52 becomes "4 years 4 months", 7 becomes "7 months".
*/
export function formatDuration(months) {
  if (months <= 0) {
    return 'now';
  }

  const years = Math.floor(months / 12);
  const leftover = months % 12;

  if (years === 0) {
    return leftover + (leftover === 1 ? ' month' : ' months');
  }

  const yearText = years + (years === 1 ? ' year' : ' years');

  if (leftover === 0) {
    return yearText;
  }

  return yearText + ' ' + leftover + (leftover === 1 ? ' month' : ' months');
}
