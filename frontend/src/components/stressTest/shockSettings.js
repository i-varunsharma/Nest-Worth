import { standardShocks } from '../../lib/shocks';

/*
  The slider values on the stress test page, and how they become the shock
  objects shared/shocks.js expects.
*/

/* The starting slider values, sized for this household from the four standard shocks. */
export function defaultSettings(finances) {
  const defaults = standardShocks(finances);

  return {
    jobMonths: defaults[0].months,
    cutPercent: defaults[1].percent,
    cutMonths: defaults[1].months,
    medicalAmount: defaults[2].amount,
    familyExtra: defaults[3].extraPerMonth,
    familyMonths: defaults[3].months,
  };
}

export function shockFor(type, settings) {
  if (type === 'job_loss') {
    return { type: 'job_loss', months: settings.jobMonths };
  }
  if (type === 'income_cut') {
    return { type: 'income_cut', percent: settings.cutPercent, months: settings.cutMonths };
  }
  if (type === 'medical') {
    return { type: 'medical', amount: settings.medicalAmount };
  }
  return { type: 'family_support', extraPerMonth: settings.familyExtra, months: settings.familyMonths };
}

export function monthsText(months) {
  if (months === 1) {
    return '1 month';
  }
  return months + ' months';
}

// How each verdict looks, shared by the tabs and the verdict card.
export const VERDICT_LOOKS = {
  safe: { dot: 'bg-accent', box: 'border-accent/25 bg-accentSoft', word: 'Gets through' },
  tight: { dot: 'bg-brass', box: 'border-brass/25 bg-brassSoft', word: 'Only just' },
  breaks: { dot: 'bg-clay', box: 'border-clay/25 bg-claySoft', word: 'Runs out' },
};
