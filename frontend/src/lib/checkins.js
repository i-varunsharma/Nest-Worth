/*
  The maths for the monthly check-ins. No React, just numbers.

  A check-in is what actually happened in one month:

    { id, month, income, spent, saved, invested, note }

  where month is 'YYYY-MM'.

  The plan says what should happen. The check-ins say what did. This file is
  what compares the two, which is the only part of the app that can tell
  somebody whether any of it is working.
*/


/* 'YYYY-MM' for the current month, which is the form the database expects. */
export function currentMonth() {
  const now = new Date();

  // getMonth counts from zero, and a single digit month has to keep its
  // leading zero or the text will not match what is stored.
  const month = String(now.getMonth() + 1).padStart(2, '0');

  return now.getFullYear() + '-' + month;
}


/* Turns '2026-08' into 'August 2026'. */
export function monthLabel(monthText) {
  const year = Number(monthText.slice(0, 4));
  const month = Number(monthText.slice(5, 7));

  // Day 1 rather than today's date, so a month with fewer days than today
  // cannot roll the answer forward into the next one.
  const date = new Date(year, month - 1, 1);

  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}


/* Was this month already recorded? */
export function hasCheckinFor(checkins, monthText) {
  for (const entry of checkins) {
    if (entry.month === monthText) {
      return true;
    }
  }

  return false;
}


/*
  What share of income a month actually kept, as a number from 0 to 100.

  Kept means saved plus invested. Spending is not counted, because the question
  this answers is "how much of it did you hold on to", and money spent is money
  gone whether it went on rent or on a holiday.
*/
export function keptShareOf(checkin) {
  if (checkin.income <= 0) {
    return 0;
  }

  const kept = checkin.saved + checkin.invested;

  return (kept / checkin.income) * 100;
}


/*
  Compares the recorded months against what the plan asked for.

    checkins          the list from the API, newest first
    plannedKeptShare  what the plan sets aside, as a percentage of income

  Returns null when there is nothing recorded, so the caller can show an
  invitation instead of a summary full of zeros.

  A note on "trend". It is only worked out from four months onwards, and it
  compares the newer half against the older half rather than the last month
  against the one before it. Two consecutive months tell you almost nothing:
  one wedding, one bonus, and a straight line looks like a collapse or a
  triumph. Halves are slower to move and much harder to mislead with.
*/
export function summariseCheckins(checkins, plannedKeptShare) {
  if (checkins.length === 0) {
    return null;
  }

  // The API returns newest first. Reverse a copy so the maths below can read in
  // date order without rearranging the list the caller handed us.
  const inDateOrder = checkins.slice().reverse();

  let totalKept = 0;
  let totalShare = 0;

  let best = inDateOrder[0];
  let bestShare = keptShareOf(best);

  for (const entry of inDateOrder) {
    totalKept = totalKept + entry.saved + entry.invested;

    const share = keptShareOf(entry);
    totalShare = totalShare + share;

    if (share > bestShare) {
      best = entry;
      bestShare = share;
    }
  }

  const averageKeptShare = totalShare / inDateOrder.length;

  /*
    Is the plan being met?

    A little slack is deliberate. Somebody hitting 29% against a plan of 30% is
    doing well, and telling them they have failed is how you get them to stop
    opening the app. Anything within two points counts as met.
  */
  const SLACK_POINTS = 2;
  const isMeetingPlan = averageKeptShare >= plannedKeptShare - SLACK_POINTS;

  // The trend, once there is enough to say anything honest.
  const MONTHS_NEEDED_FOR_TREND = 4;

  let trend = 'unknown';

  if (inDateOrder.length >= MONTHS_NEEDED_FOR_TREND) {
    const middle = Math.floor(inDateOrder.length / 2);

    const older = inDateOrder.slice(0, middle);
    const newer = inDateOrder.slice(middle);

    let olderTotal = 0;
    for (const entry of older) {
      olderTotal = olderTotal + keptShareOf(entry);
    }

    let newerTotal = 0;
    for (const entry of newer) {
      newerTotal = newerTotal + keptShareOf(entry);
    }

    const olderAverage = olderTotal / older.length;
    const newerAverage = newerTotal / newer.length;

    // Under two points either way is noise, not a direction.
    const difference = newerAverage - olderAverage;

    if (difference > SLACK_POINTS) {
      trend = 'improving';
    } else if (difference < -SLACK_POINTS) {
      trend = 'slipping';
    } else {
      trend = 'steady';
    }
  }

  return {
    count: inDateOrder.length,
    totalKept: totalKept,
    averageKeptShare: averageKeptShare,
    isMeetingPlan: isMeetingPlan,
    trend: trend,
    bestMonth: best.month,
    bestShare: bestShare,
  };
}
