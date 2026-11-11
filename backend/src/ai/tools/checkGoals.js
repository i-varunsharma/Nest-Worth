import { readFinances } from '../../services/financeService.js';
import { bucketAmount } from '../../../../shared/plan.js';
import { formatRupees } from '../../../../shared/format.js';
import { summariseGoals } from '../../../../shared/goals.js';
import { NO_HOUSEHOLD } from './helpers.js';

/*
  Tool: check_goals

  Do all the goals fit inside the monthly saving? Same check as the goals page.
*/
export const checkGoals = {
  description:
    'Check whether everything the person is saving for actually fits inside what the plan '
    + 'sets aside each month. Use this for any question about goals, affordability, or '
    + 'whether they are on track for something. Returns what each goal needs per month, '
    + 'the total, and whether that total fits.',
  input_schema: {
    type: 'object',
    properties: {},
    required: [],
  },
  describe: () => {
    return 'Checking your goals';
  },
  run: (userId) => {
    const result = readFinances(userId);

    if (result === null) {
      return NO_HOUSEHOLD;
    }

    const goals = result.snapshot.goals;

    if (goals.length === 0) {
      return 'This person has no goals recorded yet.';
    }

    // The plan they follow, the same figure the goals page compares against.
    const monthlySaving = bucketAmount(result.finances.plan, 'save');

    const summary = summariseGoals(goals, monthlySaving);

    const lines = [];

    lines.push('The plan sets aside ' + formatRupees(monthlySaving) + ' a month for saving.');
    lines.push('Together the goals need ' + formatRupees(summary.totalMonthlyNeeded) + ' a month.');

    if (summary.isAffordable === true) {
      lines.push('That fits, with ' + formatRupees(monthlySaving - summary.totalMonthlyNeeded)
        + ' a month spare.');
    } else {
      lines.push('That does not fit. It is ' + formatRupees(summary.shortfall)
        + ' a month short.');
    }

    if (summary.overdueCount > 0) {
      lines.push(summary.overdueCount + ' of them are past their date.');
    }

    return lines.join('\n');
  },

};
