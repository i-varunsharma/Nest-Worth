import { readFinances } from '../../services/financeService.js';
import { formatRupees } from '../../../../shared/format.js';
import { runShock, verdictSentence } from '../../../../shared/shocks.js';
import { NO_HOUSEHOLD } from './helpers.js';

/*
  Tool: stress_test

  One shock (job loss, pay cut, hospital bill, family need) walked forward a
  year with shared/shocks.js, the same code as the /stress-test page.
*/
export const stressTest = {
  description:
    'Walk their cash forward a year through one bad event and report whether it runs out, '
    + 'when, and how much more they would need put by. Use this for any question about '
    + 'losing a job, a pay cut, a hospital bill, a family member needing money, or "what '
    + 'happens if something goes wrong". A hospital bill is sent to the first family member '
    + 'without health cover.',
  input_schema: {
    type: 'object',
    properties: {
      shock: {
        type: 'string',
        description: 'One of: job_loss, income_cut, medical, family_support.',
      },
      months: {
        type: 'number',
        description: 'How long it lasts, 1 to 12. For job_loss, income_cut and family_support.',
      },
      percent: {
        type: 'number',
        description: 'For income_cut: how much the income falls, as a percentage.',
      },
      amount: {
        type: 'number',
        description: 'For medical: the size of the bill in rupees.',
      },
      extra_per_month: {
        type: 'number',
        description: 'For family_support: the extra rupees needed each month.',
      },
    },
    required: ['shock'],
  },
  describe: () => {
    return 'Stress testing your savings';
  },
  run: (userId, input) => {
    const result = readFinances(userId);

    if (result === null) {
      return NO_HOUSEHOLD;
    }

    const outcome = runShock({
      finances: result.finances,
      family: result.snapshot.family,
      shock: {
        type: input.shock,
        months: input.months,
        percent: input.percent,
        amount: input.amount,
        extraPerMonth: input.extra_per_month,
      },
    });

    if (outcome === null) {
      return 'There is no shock called "' + input.shock + '". Use job_loss, income_cut, '
        + 'medical or family_support.';
    }

    const lines = [];

    lines.push('The event: ' + outcome.description);
    lines.push('Cash they can reach today: ' + formatRupees(outcome.startCash) + '.');
    lines.push('During the bad months investing pauses and everyday spending halves; the EMI '
      + 'and family support still go out.');
    lines.push('Lowest point: ' + formatRupees(outcome.lowestCash) + ' in month '
      + outcome.lowestMonth + '. After a year: ' + formatRupees(outcome.endCash) + '.');
    lines.push(verdictSentence(outcome));

    return lines.join('\n');
  },

};
