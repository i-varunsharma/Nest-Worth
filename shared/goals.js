/*
  The maths behind a savings goal: how much is left, how long there is, and
  therefore how much has to go in every month.

  A goal here is:
    { id, name, targetAmount, savedAmount, targetDate }

  targetDate is text in 'YYYY-MM-DD' form, the way it comes out of the database
  and the way a date input gives it back.
*/


/*
  How many whole months there are between now and a date.

  Working in months rather than days is on purpose. Somebody saving for a
  wedding thinks in months, not in 431 days, and the answer they want is a
  monthly amount.

  Returns 0 for a date in the past, because a goal whose date has gone still
  needs its remaining amount, just now rather than later.
*/
export function monthsUntil(targetDate) {
  if (typeof targetDate !== 'string') {
    return 0;
  }

  /*
    The date is read out of the text rather than handed to new Date().

    new Date('2027-06-01') is not the 1st of June where you are standing. The
    browser reads a plain date like that as midnight UTC, and then getDate()
    gives it back in your own timezone, so anybody west of London sees the 31st
    of May and every goal is a month out. Splitting the text avoids the whole
    problem, because these three numbers are all this function needs.
  */
  const parts = targetDate.split('-');

  if (parts.length !== 3) {
    return 0;
  }

  const targetYear = Number(parts[0]);
  const targetMonth = Number(parts[1]);
  const targetDay = Number(parts[2]);

  if (!Number.isFinite(targetYear) || !Number.isFinite(targetMonth) || !Number.isFinite(targetDay)) {
    return 0;
  }

  const now = new Date();
  const nowMonth = now.getMonth() + 1;

  let total = (targetYear - now.getFullYear()) * 12 + (targetMonth - nowMonth);

  // Part way through the month only counts as a whole month if the day has not
  // gone past yet.
  if (targetDay < now.getDate()) {
    total = total - 1;
  }

  if (total < 0) {
    return 0;
  }

  return total;
}


/*
  Works out everything the interface needs to show about one goal.

  Returns:
    remaining     how much is still to be found
    months        how long there is
    monthlyNeeded what has to go in each month to arrive on time
    percentDone   0 to 100, for the progress bar
    isComplete    the target has been reached
    isOverdue     the date has passed and it is not complete
*/
export function describeGoal(goal) {
  const target = goal.targetAmount;
  const saved = goal.savedAmount;

  let remaining = target - saved;
  if (remaining < 0) {
    remaining = 0;
  }

  const months = monthsUntil(goal.targetDate);
  const isComplete = remaining === 0;

  /*
    How much per month. Dividing by zero months would give Infinity, which
    would print as "₹Infinity" on the page, so the no-time-left case is handled
    separately: the whole remaining amount is needed right now.
  */
  let monthlyNeeded = 0;
  if (!isComplete) {
    if (months <= 0) {
      monthlyNeeded = remaining;
    } else {
      monthlyNeeded = remaining / months;
    }
  }

  let percentDone = 0;
  if (target > 0) {
    percentDone = (saved / target) * 100;
    if (percentDone > 100) {
      percentDone = 100;
    }
  }

  const isOverdue = months <= 0 && !isComplete;

  return {
    remaining: remaining,
    months: months,
    monthlyNeeded: monthlyNeeded,
    percentDone: percentDone,
    isComplete: isComplete,
    isOverdue: isOverdue,
  };
}


/*
  Adds up every goal, and compares the total monthly requirement against what
  the plan actually sets aside each month.

  This comparison is the honest part. It is easy to write down five goals and
  never notice that together they need more than you save. Saying so plainly is
  more useful than five green progress bars.
*/
export function summariseGoals(goals, monthlyCapacity) {
  let totalTarget = 0;
  let totalSaved = 0;
  let totalMonthlyNeeded = 0;
  let completeCount = 0;
  let overdueCount = 0;

  goals.forEach((goal) => {
    const detail = describeGoal(goal);

    totalTarget = totalTarget + goal.targetAmount;
    totalSaved = totalSaved + goal.savedAmount;
    totalMonthlyNeeded = totalMonthlyNeeded + detail.monthlyNeeded;

    if (detail.isComplete) {
      completeCount = completeCount + 1;
    }
    if (detail.isOverdue) {
      overdueCount = overdueCount + 1;
    }
  });

  const isAffordable = totalMonthlyNeeded <= monthlyCapacity;

  return {
    count: goals.length,
    totalTarget: totalTarget,
    totalSaved: totalSaved,
    totalMonthlyNeeded: totalMonthlyNeeded,
    completeCount: completeCount,
    overdueCount: overdueCount,
    isAffordable: isAffordable,
    shortfall: Math.max(totalMonthlyNeeded - monthlyCapacity, 0),
  };
}


/*
  How many months of spending an emergency fund would cover.

  The usual advice is three to six months. We suggest six for anybody supporting
  other people, because a household that depends on one salary has no second
  income to fall back on while a job is found.

  A variable income adds three more on top. The standard advice quietly assumes
  a salary that either arrives or stops; for a freelancer the gap between two
  contracts is not an emergency, it is a Tuesday, and the fund has to absorb
  that as well as the real emergencies.

  incomeVaries is optional, so an older caller that does not pass it gets the
  same answer it always did.
*/
export function safetyNet(cashSavings, monthlyOutgoings, dependents, incomeVaries) {
  let monthsTarget = 3;
  if (dependents > 0) {
    monthsTarget = 6;
  }

  if (incomeVaries === true) {
    monthsTarget = monthsTarget + 3;
  }

  let monthsCovered = 0;
  if (monthlyOutgoings > 0) {
    monthsCovered = cashSavings / monthlyOutgoings;
  }

  const amountTarget = monthlyOutgoings * monthsTarget;

  let percentDone = 0;
  if (amountTarget > 0) {
    percentDone = (cashSavings / amountTarget) * 100;
    if (percentDone > 100) {
      percentDone = 100;
    }
  }

  return {
    monthsCovered: monthsCovered,
    monthsTarget: monthsTarget,
    amountTarget: amountTarget,
    percentDone: percentDone,
    isEnough: monthsCovered >= monthsTarget,
  };
}
