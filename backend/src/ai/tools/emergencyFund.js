import { readFinances } from '../../services/financeService.js';
import { formatRupees } from '../../../../shared/format.js';
import { NO_HOUSEHOLD } from './helpers.js';

/*
  Tool: emergency_fund

  How many months the reachable cash covers, against the target.
*/
export const emergencyFund = {
  description:
    'Work out how many months the person could survive on the cash they can actually reach '
    + 'if their income stopped, and what the target should be for their situation. Use this '
    + 'for any question about emergency funds, safety nets, job loss, or whether they have '
    + 'enough put by.',
  input_schema: {
    type: 'object',
    properties: {},
    required: [],
  },
  describe: () => {
    return 'Checking your safety net';
  },
  run: (userId) => {
    const result = readFinances(userId);

    if (result === null) {
      return NO_HOUSEHOLD;
    }

    const netWorth = result.finances.netWorth;
    const monthlyOutgoings = result.finances.monthlyCosts;
    const safety = result.finances.safety;

    const lines = [];

    lines.push('Cash they could reach quickly: ' + formatRupees(netWorth.liquidAssets)
      + '. Only savings accounts and fixed deposits count; funds, gold and property do not.');
    lines.push('One month costs about ' + formatRupees(monthlyOutgoings) + '.');
    lines.push('That covers ' + safety.monthsCovered.toFixed(1) + ' months.');
    lines.push('The target for this household is ' + safety.monthsTarget + ' months, which is '
      + formatRupees(safety.amountTarget) + '.');

    if (safety.isEnough === true) {
      lines.push('They are past the target.');
    } else {
      lines.push('They are ' + formatRupees(safety.amountTarget - netWorth.liquidAssets)
        + ' short of it.');
    }

    return lines.join('\n');
  },

};
