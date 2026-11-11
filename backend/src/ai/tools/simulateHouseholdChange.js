import { readFinances } from '../../services/financeService.js';
import { bucketAmount } from '../../../../shared/plan.js';
import { formatRupees } from '../../../../shared/format.js';
import { NO_HOUSEHOLD, whatIfFinances } from './helpers.js';

/*
  Tool: simulate_household_change

  "What if I got a raise / moved to a cheaper flat?" Rebuilds the plan
  with the change, without saving anything.
*/
export const simulateHouseholdChange = {
  description:
    'Rebuild the whole spend/save/invest plan with one part of the household changed: a '
    + 'different income, different rent and bills, or more money sent to family each month. '
    + 'Use this for any "what if" about their situation rather than their debts, such as a '
    + 'raise, a move to a cheaper flat, or a parent becoming dependent. '
    + 'Only pass the fields that change; everything else stays as it really is.',
  input_schema: {
    type: 'object',
    properties: {
      income: {
        type: 'number',
        description: 'A different monthly take-home income, in rupees.',
      },
      essential_costs: {
        type: 'number',
        description: 'Different rent, food and bills per month, in rupees.',
      },
      extra_family_support: {
        type: 'number',
        description: 'Extra rupees a month sent to family on top of what is sent now, '
          + 'for example a parent who starts needing help.',
      },
    },
    required: [],
  },
  describe: () => {
    return 'Rebuilding the plan';
  },
  run: (userId, input) => {
    const changes = {
      income: Number(input.income),
      essentialCosts: Number(input.essential_costs),
      extraSupport: Number(input.extra_family_support),
    };

    const current = readFinances(userId);

    if (current === null) {
      return NO_HOUSEHOLD;
    }

    // The recommended plan on both sides, so the only difference is the change.
    const now = current.finances.recommendedPlan;
    const changed = whatIfFinances(userId, changes).recommendedPlan;

    const lines = [];

    lines.push('As things are: ' + formatRupees(now.free) + ' a month is left after the '
      + 'household and the EMI. Split: spend ' + formatRupees(bucketAmount(now, 'spend'))
      + ', save ' + formatRupees(bucketAmount(now, 'save'))
      + ', invest ' + formatRupees(bucketAmount(now, 'invest')) + '.');

    lines.push('With the change: ' + formatRupees(changed.free) + ' a month is left. '
      + 'Split: spend ' + formatRupees(bucketAmount(changed, 'spend'))
      + ', save ' + formatRupees(bucketAmount(changed, 'save'))
      + ', invest ' + formatRupees(bucketAmount(changed, 'invest')) + '.');

    const difference = changed.free - now.free;

    if (difference > 0) {
      lines.push('That is ' + formatRupees(difference) + ' a month more to decide about.');
    } else if (difference < 0) {
      lines.push('That is ' + formatRupees(Math.abs(difference)) + ' a month less to decide about.');
    } else {
      lines.push('That changes nothing about what is left each month.');
    }

    return lines.join('\n');
  },

};
