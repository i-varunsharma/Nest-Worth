/*
  Loan payoff maths. Each month interest is added to the balance and the EMI is
  taken off; repeating that until the balance is zero gives the payoff date and the
  total interest. Stepping month by month is easier to check than the closed-form
  formula and fast enough.
*/


// A loan that never gets paid off would loop forever, so we stop after this
// many months and report that it does not clear. 600 months is 50 years.
const MAX_MONTHS = 600;


/*
  How long a loan takes to clear, and what it costs.

    principal   what is still owed
    annualRate  yearly interest as a percentage (11.2 means 11.2%)
    emi         the monthly payment
    extra       optional amount paid on top each month

  Returns { clears, months, totalInterest, totalPaid, payoffDate }. When clears is
  false, reason says why:
    'interest'  the payment is below the interest, so the balance grows
    'tooSlow'   the balance falls, but is still there after MAX_MONTHS
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

  // Stopping at the cap is not clearing. Without this check a loan that never ends
  // would get a payoff date fifty years out.
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


// Paying the EMI alone compared with paying extra every month: months saved and
// interest saved.
export function extraPaymentEffect(principal, annualRate, emi, extra) {
  const asIs = payoff(principal, annualRate, emi, 0);
  const withExtra = payoff(principal, annualRate, emi, extra);

  // The extra is not enough to make this debt finish, so there is no payoff
  // date to compare against and nothing honest to show.
  if (!withExtra.clears) {
    return { possible: false };
  }

  // Never clears on the EMI alone, but does with the extra. There are no months
  // saved to report, only that it now finishes, and when.
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


// Debts in the cheapest order to clear: highest rate first (the avalanche
// method). slice() copies the list, because sort() changes the original.
export function orderByRate(debts) {
  return debts.slice().sort((a, b) => b.annualRate - a.annualRate);
}


// Totals across all debts. debtFreeDate is when the last one clears.
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


// A date some months from today. The day is set to 1 first: adding a month to
// 31 May asks for 31 June, which JavaScript rolls over into July.
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


// 52 becomes "4 years 4 months"; 7 becomes "7 months".
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
