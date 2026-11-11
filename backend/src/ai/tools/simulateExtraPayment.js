import { readSnapshot } from '../../services/financeService.js';
import { formatDuration, formatMonthYear, formatRupees } from '../../../../shared/format.js';
import { extraPaymentEffect, payoff } from '../../../../shared/debt.js';
import { findDebtByName } from './helpers.js';

/*
  Tool: simulate_extra_payment

  "What if I paid ₹5,000 more on my credit card?" Uses the same payoff
  maths as the debts page (shared/debt.js).
*/
export const simulateExtraPayment = {
  description:
    'Work out what happens to one debt if the person pays a fixed amount more every month. '
    + 'Use this for any "what if I paid more" question, and also when suggesting that they '
    + 'should, so the suggestion comes with a real date and a real saving rather than a guess. '
    + 'Returns the new payoff date, the months saved and the interest saved.',
  input_schema: {
    type: 'object',
    properties: {
      debt_name: {
        type: 'string',
        description: 'The name of the debt, as it appears in the list you were given.',
      },
      extra_per_month: {
        type: 'number',
        description: 'Extra rupees paid every month on top of the existing EMI.',
      },
    },
    required: ['debt_name', 'extra_per_month'],
  },
  describe: (input) => {
    return 'Running the numbers on ' + input.debt_name;
  },
  run: (userId, input) => {
    const debts = readSnapshot(userId).debts;

    if (debts.length === 0) {
      return 'This person has no debts recorded, so there is nothing to simulate.';
    }

    const names = debts.map((one) => { return one.name; }).join(', ');

    if (typeof input.debt_name !== 'string' || input.debt_name.trim().length === 0) {
      return 'You did not say which debt. The ones on record are: ' + names;
    }

    const debt = findDebtByName(debts, input.debt_name);

    if (!debt) {
      return 'There is no debt called "' + input.debt_name + '". The ones on record are: ' + names;
    }

    const extra = Number(input.extra_per_month);

    if (!Number.isFinite(extra) || extra < 0) {
      return 'The extra amount has to be zero or more.';
    }

    const base = payoff(debt.principal, debt.annualRate, debt.emi, 0);
    const effect = extraPaymentEffect(debt.principal, debt.annualRate, debt.emi, extra);

    const lines = [];

    lines.push('Debt: ' + debt.name + ', ' + formatRupees(debt.principal)
      + ' owed at ' + debt.annualRate + '%, EMI ' + formatRupees(debt.emi) + '.');

    if (base.clears === true) {
      lines.push('On the EMI alone: clears ' + formatMonthYear(base.payoffDate)
        + ', ' + formatDuration(base.months) + ' away, costing '
        + formatRupees(base.totalInterest) + ' in interest.');
    } else {
      lines.push('On the EMI alone: this debt never clears. The payment does not '
        + 'outrun the interest.');
    }

    if (effect.possible === false) {
      lines.push('With ' + formatRupees(extra) + ' extra: still never clears. '
        + 'It needs more than that to turn around.');

      return lines.join('\n');
    }

    lines.push('With ' + formatRupees(extra) + ' extra a month: clears '
      + formatMonthYear(effect.newPayoffDate) + ', '
      + formatDuration(effect.newMonths) + ' away.');

    if (effect.turnsAround === true) {
      lines.push('That is the difference between never finishing and finishing.');
    } else {
      lines.push('That is ' + formatDuration(effect.monthsSaved) + ' sooner and '
        + formatRupees(effect.interestSaved) + ' less interest.');
    }

    return lines.join('\n');
  },

};
