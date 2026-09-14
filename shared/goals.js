// Savings goal maths. A goal is { id, name, targetAmount, savedAmount, targetDate },
// with targetDate as 'YYYY-MM-DD'.


// Whole months from now until a date, or 0 when the date has passed.
export function monthsUntil(targetDate) {
  if (typeof targetDate !== 'string') {
    return 0;
  }

  // The date is split from the text, not passed to new Date(). new Date('2027-06-01')
  // means midnight UTC, which is still 31 May in timezones west of London.
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


// What the page shows for one goal:
//   remaining, months, monthlyNeeded, percentDone, isComplete, isOverdue
export function describeGoal(goal) {
  const target = goal.targetAmount;
  const saved = goal.savedAmount;

  let remaining = target - saved;
  if (remaining < 0) {
    remaining = 0;
  }

  const months = monthsUntil(goal.targetDate);
  const isComplete = remaining === 0;

  // With no months left the whole remaining amount is needed now, rather than
  // dividing by zero.
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


// Adds up all goals and compares what they need each month with what the plan
// saves, so goals that do not fit together are reported.
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
  Months of costs the cash savings would cover, against a target: 3 months, 6 when
  supporting anyone, and 3 more for a variable income, where a gap between contracts
  is normal rather than an emergency.
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
