import { bestAndWorstMonth, monthlyTrend, overallSummary } from '../../reports/insights.js';
import { formatRupees } from '../../../../shared/format.js';

/*
  Tool: spending_trend

  What actually happened in the recorded check-ins. The numbers come from
  SQL in reports/insights.js.
*/
export const spendingTrend = {
  description:
    'Look at what actually happened over the recorded months, rather than what the plan '
    + 'says should happen. Use this for any question about habits, consistency, whether '
    + 'things are getting better or worse, or how a recent month compares with the usual. '
    + 'Returns each month, the share of income kept, the running total kept, and the best '
    + 'and worst months.',
  input_schema: {
    type: 'object',
    properties: {
      months: {
        type: 'number',
        description: 'How many of the most recent months to describe. Defaults to 6.',
      },
    },
    required: [],
  },
  describe: () => {
    return 'Looking at your recent months';
  },
  run: (userId, input) => {
    const summary = overallSummary(userId);

    if (summary.monthsRecorded === 0) {
      return 'This person has not recorded any months yet, so there is no history to look at. '
        + 'Suggest they record one.';
    }

    let howMany = 6;
    if (Number.isFinite(Number(input.months)) && Number(input.months) > 0) {
      howMany = Math.min(Math.round(Number(input.months)), 24);
    }

    const everything = monthlyTrend(userId);
    const recent = everything.slice(Math.max(everything.length - howMany, 0));

    const lines = [];

    lines.push('Across ' + summary.monthsRecorded + ' recorded months they kept '
      + formatRupees(summary.totalKept) + ' in total, averaging '
      + summary.averageKeptPercent + '% of income.');
    lines.push('');

    recent.forEach((month) => {
      let line = '- ' + month.month + ': earned ' + formatRupees(month.income)
        + ', kept ' + formatRupees(month.kept);

      // Null rather than zero, for a month with no income at all.
      if (month.keptPercent !== null) {
        line = line + ' (' + month.keptPercent + '%)';
      } else {
        line = line + ' (no income that month)';
      }

      if (month.changeFromLastMonth !== null) {
        if (month.changeFromLastMonth > 0) {
          line = line + ', ' + formatRupees(month.changeFromLastMonth) + ' more than the month before';
        } else if (month.changeFromLastMonth < 0) {
          line = line + ', ' + formatRupees(Math.abs(month.changeFromLastMonth))
            + ' less than the month before';
        }
      }

      lines.push(line);
    });

    const extremes = bestAndWorstMonth(userId);

    if (extremes.best && extremes.worst) {
      lines.push('');
      lines.push('Best month: ' + extremes.best.month + ' at ' + extremes.best.keptPercent + '%.');
      lines.push('Worst month: ' + extremes.worst.month + ' at ' + extremes.worst.keptPercent + '%.');
      lines.push('Months with no income at all are left out of best and worst.');
    }

    return lines.join('\n');
  },

};
