import { ASSUMED_YEARLY_RETURN, bucketAmount } from './plan.js';
import { monthsFromNow, orderByRate } from './debt.js';

/*
  Different ways the same money could be used, each played out fifteen years.

  Walks month by month rather than using a formula, because the key event is a
  debt clearing: its EMI stops and becomes money to invest. Without that, paying
  debt early always looks worse than investing.
*/


// How far to play each scenario out. Long enough for the debt-first case to
// overtake, which is the comparison worth seeing.
export const SCENARIO_YEARS = 15;

// A month past this and the simulation stops. It is a guard, not a rule: the
// loop below is bounded by the years above.
const MONTHS_IN_A_YEAR = 12;


/*
  Plays one choice out month by month.

    { debts, monthlyInvest, monthlySave, extraToDebt, years }

  Named fields rather than positional arguments: inserting monthlySave into the old
  positional version silently turned callers' extra payments into savings.

  Returns { rows, debtFreeMonth }. rows has one entry per year:
  { year, invested, value, cash, total, debtLeft }. Cash is counted but does not
  grow, like a savings account. The debt free month comes from this walk, which
  rolls a cleared debt's payment onto the next one; payoff() per debt cannot.

  Each month: interest is charged, payments are made, the rest is invested, and
  investments grow.
*/
export function simulate(options) {
  const debts = options.debts;
  const monthlyInvest = options.monthlyInvest;
  const monthlySave = options.monthlySave;
  const extraToDebt = options.extraToDebt;
  const years = options.years;

  const monthlyReturn = ASSUMED_YEARLY_RETURN / MONTHS_IN_A_YEAR;

  // A working copy, so the caller's debt objects are never changed.
  const balances = orderByRate(debts).map((debt) => {
    return {
      balance: debt.principal,
      monthlyRate: debt.annualRate / 100 / MONTHS_IN_A_YEAR,
      emi: debt.emi,
      isCleared: false,
    };
  });

  let invested = 0;
  let value = 0;
  let cash = 0;

  const rows = [{
    year: 0,
    invested: 0,
    value: 0,
    cash: 0,
    total: 0,
    debtLeft: totalOf(balances),
  }];

  // Null until every debt has gone. It stays null for somebody whose debts do
  // not clear inside the years simulated, which is an answer in itself.
  let debtFreeMonth = null;

  if (balances.length === 0) {
    debtFreeMonth = 0;
  }

  const totalMonths = years * MONTHS_IN_A_YEAR;

  for (let month = 1; month <= totalMonths; month = month + 1) {
    // What is available to invest this month, before anything is paid.
    let toInvest = monthlyInvest;

    // The extra payment goes at the most expensive debt still running, which is
    // the first one in the list that has not cleared.
    let extraLeft = extraToDebt;

    balances.forEach((debt) => {
      if (debt.isCleared === true) {
        // A cleared debt's EMI is freed and invested. This is what lets clearing debt
        // early win in the end.
        toInvest = toInvest + debt.emi;
        return;
      }

      // Interest first, the way a lender charges it.
      debt.balance = debt.balance + debt.balance * debt.monthlyRate;

      let payment = debt.emi;

      // Only the most expensive debt still running gets the extra.
      if (extraLeft > 0) {
        payment = payment + extraLeft;
        extraLeft = 0;
      }

      if (payment >= debt.balance) {
        // The last payment is smaller than a full EMI; the unused part is invested.
        toInvest = toInvest + (payment - debt.balance);
        debt.balance = 0;
        debt.isCleared = true;
      } else {
        debt.balance = debt.balance - payment;
      }
    });

    // An extra payment with no debt left to pay goes to investing. The first version
    // dropped it, which made clearing debt early look like losing money.
    toInvest = toInvest + extraLeft;

    if (toInvest < 0) {
      toInvest = 0;
    }

    invested = invested + toInvest;
    value = (value + toInvest) * (1 + monthlyReturn);

    // Cash just piles up. No growth, because a savings account is not an
    // investment and pretending otherwise is how a plan gets oversold.
    cash = cash + monthlySave;

    // The first month with nothing left owed is the month they are debt free.
    if (debtFreeMonth === null && totalOf(balances) <= 0) {
      debtFreeMonth = month;
    }

    if (month % MONTHS_IN_A_YEAR === 0) {
      rows.push({
        year: month / MONTHS_IN_A_YEAR,
        invested: Math.round(invested),
        value: Math.round(value),
        cash: Math.round(cash),
        total: Math.round(value + cash),
        debtLeft: Math.round(totalOf(balances)),
      });
    }
  }

  return { rows: rows, debtFreeMonth: debtFreeMonth };
}


/* What is still owed across every debt in the working copy. */
function totalOf(balances) {
  let total = 0;

  balances.forEach((debt) => {
    total = total + debt.balance;
  });

  return total;
}


/*
  The choices worth showing this household. No debt means no "clear the debt
  first"; a full safety net means no "build the safety net".

    basePlan       the recommended plan, from buildHouseholdPlan
    debts          the real debts
    liquidSavings  cash that can be reached quickly
    monthsTarget   months of cover this household should aim for
    monthlyCosts   what one month costs

  Every choice moves the same free money between buckets, so they compare fairly.
*/
export function buildScenarios(options) {
  const basePlan = options.basePlan;
  const debts = options.debts;

  const worstDebt = orderByRate(debts)[0];

  const baseSpend = bucketAmount(basePlan, 'spend');
  const baseSave = bucketAmount(basePlan, 'save');
  const baseInvest = bucketAmount(basePlan, 'invest');

  // What is already committed before any choice is made.
  const committed = basePlan.support + basePlan.emi + basePlan.essentialCosts;

  const choices = [];

  // ---------------------------------------------------------------
  // 1. What the plan already says. Always shown, as the thing to compare to.
  // ---------------------------------------------------------------
  choices.push({
    key: 'balanced',
    name: 'Your plan as it stands',
    idea: 'The split the app already recommends, with nothing moved.',
    spend: baseSpend,
    save: baseSave,
    invest: baseInvest,
    extraToDebt: 0,
  });

  // ---------------------------------------------------------------
  // 2. Clear the expensive debt first. Only if there is one.
  // ---------------------------------------------------------------
  if (worstDebt) {
    // The investing money and half the saving go at the worst debt. Half the saving
    // stays, so a small emergency does not become a new debt.
    const halfSave = Math.round(baseSave / 2);
    const extra = baseInvest + halfSave;

    choices.push({
      key: 'debt',
      name: 'Clear the expensive debt first',
      idea: 'Send the investing money, and half the saving, at your '
        + worstDebt.name.toLowerCase() + ' until it is gone.',
      spend: baseSpend,
      save: baseSave - halfSave,
      invest: 0,
      extraToDebt: extra,
    });
  }

  // ---------------------------------------------------------------
  // 3. Fill the emergency fund. Only if it is not already full.
  // ---------------------------------------------------------------
  const fundTarget = options.monthlyCosts * options.monthsTarget;

  if (options.liquidSavings < fundTarget) {
    choices.push({
      key: 'buffer',
      name: 'Build the safety net first',
      idea: 'Hold the investing money as cash until you have '
        + options.monthsTarget + ' months of costs put by.',
      spend: baseSpend,
      save: baseSave + baseInvest,
      invest: 0,
      extraToDebt: 0,
    });
  }

  // ---------------------------------------------------------------
  // 4. Spend less, invest more. Always available, and always the hardest.
  // ---------------------------------------------------------------
  const cutFromSpending = Math.round(baseSpend * 0.2);

  if (cutFromSpending > 0) {
    choices.push({
      key: 'invest',
      name: 'Spend a fifth less',
      idea: 'Cut discretionary spending by 20% and invest the difference. '
        + 'The hardest one to keep, and the one that compounds.',
      spend: baseSpend - cutFromSpending,
      save: baseSave,
      invest: baseInvest + cutFromSpending,
      extraToDebt: 0,
    });
  }

  // Plays each choice out and attaches its outcomes.
  return choices.map((choice) => {
    const played = simulate({
      debts: debts,
      monthlyInvest: choice.invest,
      monthlySave: choice.save,
      extraToDebt: choice.extraToDebt,
      years: SCENARIO_YEARS,
    });
    const rows = played.rows;
    const lastRow = rows[rows.length - 1];

    // How many months of costs the saving covers after a year of this choice.
    const savedInAYear = options.liquidSavings + choice.save * MONTHS_IN_A_YEAR;

    let monthsCoveredInAYear = 0;
    if (options.monthlyCosts > 0) {
      monthsCoveredInAYear = savedInAYear / options.monthlyCosts;
    }

    return {
      key: choice.key,
      name: choice.name,
      idea: choice.idea,

      // Where every rupee of income goes under this choice.
      allocation: {
        committed: committed,
        spend: choice.spend,
        save: choice.save,
        invest: choice.invest,
        extraToDebt: choice.extraToDebt,
      },

      outcomes: {
        // Rounded to one decimal, because "4.7 months of cover" is a figure
        // somebody can act on and 4.68329 is not.
        monthsCoveredInAYear: Math.round(monthsCoveredInAYear * 10) / 10,
        debtFreeMonths: played.debtFreeMonth,
        debtFreeDate: played.debtFreeMonth === null ? null : monthsFromNow(played.debtFreeMonth),
        investedAfterYears: lastRow.invested,
        valueAfterYears: lastRow.value,
        cashAfterYears: lastRow.cash,

        // What the charts compare: everything they would actually have.
        totalAfterYears: lastRow.total,
      },

      rows: rows,
    };
  });
}


/*
  Returns a copy of the plan showing the split somebody chose on /plans.

  Extra sent at a debt is added to the EMI, because it leaves before any choice
  is made. The original plan is not changed.

    plan     from buildPlan
    chosen   one scenario from buildScenarios
*/
export function applyChosenPlan(plan, chosen) {
  const allocation = chosen.allocation;

  const emi = plan.emi + allocation.extraToDebt;
  const free = allocation.spend + allocation.save + allocation.invest;

  // Percentages are recalculated from the new amounts, so bars match their figures.
  function shareOf(amount) {
    if (free <= 0) {
      return 0;
    }

    return Math.round((amount / free) * 100);
  }

  return {
    income: plan.income,
    support: plan.support,
    emi: emi,
    essentialCosts: plan.essentialCosts,
    free: free,

    buckets: [
      { key: 'spend', label: 'Spend', percent: shareOf(allocation.spend), amount: allocation.spend },
      { key: 'save', label: 'Save', percent: shareOf(allocation.save), amount: allocation.save },
      { key: 'invest', label: 'Invest', percent: shareOf(allocation.invest), amount: allocation.invest },
    ],

    // The sentence stays as it was: the reasoning behind the recommendation is
    // still true, and still worth reading, even when somebody chose otherwise.
    reasoning: plan.reasoning,
  };
}
