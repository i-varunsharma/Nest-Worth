// Monthly check-in maths. A check-in is { id, month, income, spent, saved, invested,
// note } with month as 'YYYY-MM': what actually happened, to compare with the plan.


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


// The share of income kept (saved plus invested), from 0 to 100.
export function keptShareOf(checkin) {
  if (checkin.income <= 0) {
    return 0;
  }

  const kept = checkin.saved + checkin.invested;

  return (kept / checkin.income) * 100;
}


/*
  Compares recorded months with what the plan asks for.

    checkins          newest first
    plannedKeptShare  the plan's kept share of income, as a percentage

  Returns null when nothing is recorded. The trend compares the newer half of the
  months with the older half, from four months on, so one unusual month cannot
  look like a collapse.
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

  // Within two points of the plan counts as meeting it.
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
