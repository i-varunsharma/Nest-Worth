import { readFinances } from '../../services/financeService.js';
import { formatDuration, formatMonthYear, formatRupees } from '../../../../shared/format.js';
import { NO_HOUSEHOLD } from './helpers.js';

/*
  Tool: compare_plans

  The 15 year plans from the /plans page, written out as text.
*/
export const comparePlans = {
  description:
    'Play out several different ways this person could use the same money, fifteen years '
    + 'each, and return where every one of them lands. Use this whenever they ask what they '
    + 'SHOULD do, which choice is better, whether to clear debt or invest, or any question '
    + 'that is really a comparison between options. Each plan comes back with what it does '
    + 'to their monthly split, when the debt clears, how much emergency cover it builds, and '
    + 'what the investing is worth after fifteen years. Recommend one and say what it costs.',
  input_schema: {
    type: 'object',
    properties: {},
    required: [],
  },
  describe: () => {
    return 'Comparing your options';
  },
  run: (userId) => {
    const result = readFinances(userId);

    if (result === null) {
      return NO_HOUSEHOLD;
    }

    const plans = result.finances.scenarios;
    const safety = result.finances.safety;

    const lines = [];

    lines.push('Every plan below uses the same ' + formatRupees(result.snapshot.household.income)
      + ' a month. They differ only in how it is split.');
    lines.push('');

    plans.forEach((one) => {
      const a = one.allocation;
      const o = one.outcomes;

      lines.push(one.name.toUpperCase());
      lines.push('  ' + one.idea);
      lines.push('  Monthly: spend ' + formatRupees(a.spend)
        + ', save ' + formatRupees(a.save)
        + ', invest ' + formatRupees(a.invest)
        + ', extra at debt ' + formatRupees(a.extraToDebt) + '.');

      if (o.debtFreeMonths === null) {
        lines.push('  Debt: does not clear within fifteen years.');
      } else if (o.debtFreeMonths > 0) {
        lines.push('  Debt free in ' + formatDuration(o.debtFreeMonths)
          + ', by ' + formatMonthYear(o.debtFreeDate) + '.');
      } else {
        lines.push('  No debt to clear.');
      }

      lines.push('  Emergency cover after a year: ' + o.monthsCoveredInAYear
        + ' months, against a target of ' + safety.monthsTarget + '.');
      lines.push('  After fifteen years they would have '
        + formatRupees(o.totalAfterYears) + ' in total: '
        + formatRupees(o.valueAfterYears) + ' invested and '
        + formatRupees(o.cashAfterYears) + ' held as cash.');
      lines.push('');
    });

    lines.push('These are on the Plans page in the app, with charts, if they want to '
      + 'look at them properly.');

    return lines.join('\n');
  },

};
