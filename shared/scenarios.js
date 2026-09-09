import { ASSUMED_YEARLY_RETURN, buildPlan, bucketAmount } from './plan.js';
import { monthsFromNow, orderByRate } from './debt.js';

/*
  Different ways the same money could be used, each played out to the end.

  The plan model answers one question: given this household, what is a sensible
  split? This file answers a different one: what if you chose differently? Send
  the investing money at the credit card instead. Hold more as cash until the
  emergency fund is full. Put the lot into index funds.

  Nobody can judge those from percentages. They only mean something once you can
  see where each one lands, which is what the simulation below produces.

  The honest comparison is the whole point, and it is the part a simpler version
  gets wrong. Paying extra at a debt looks worse for years: you are investing
  less every month, so the line is lower. What that misses is the moment the
  debt clears, when the EMI stops leaving your account and becomes money you can
  invest instead. Comparing the two without modelling that hands somebody an
  argument against the thing that is usually right.

  So this walks month by month rather than using a formula. Each month it pays
  the debts, invests what is left, grows what is already invested, and notices
  when a debt finishes and its EMI becomes free.
*/


// How far to play each scenario out. Long enough for the debt-first case to
// overtake, which is the comparison worth seeing.
export const SCENARIO_YEARS = 15;

// A month past this and the simulation stops. It is a guard, not a rule: the
// loop below is bounded by the years above.
const MONTHS_IN_A_YEAR = 12;


/*
  Plays one choice out, month by month.

  Takes one object rather than five positional arguments:

    { debts, monthlyInvest, monthlySave, extraToDebt, years }

  Five things in a row is four chances to put two of them the wrong way round,
  and nothing would complain: the answer would just be wrong. Adding
  monthlySave in the middle of the old positional version silently turned every
  existing caller's extra payment into a saving, which is how this was found.
  Named fields cannot do that.

  Returns { rows, debtFreeMonth }, where rows is one entry per year:
  { year, invested, value, cash, total, debtLeft }

  Cash is counted as well as investments, and the chart draws the total of the
  two. Counting only the investments was unfair in a way that mattered: the
  plan that holds money as cash appeared to destroy it, when what it actually
  does is trade growth for money you can reach on a bad Tuesday. Cash does not
  compound here, because it does not compound in a savings account either, and
  that difference is the honest argument between the two plans.

  The debt-free month comes from this simulation rather than from a separate
  calculation, and that is not a detail. The first version worked it out with
  payoff() per debt instead, and reported the same date for every scenario:
  payoff() looks at one debt on its own, so it never saw that clearing the
  credit card frees the extra payment to roll onto the loan behind it. The
  simulation does model that, so the two disagreed, and the one shown on screen
  was the wrong one. Now there is only one answer and it comes from the loop
  that actually plays it out.

  The order inside the loop matters and mirrors real life: interest is charged
  first, then the payment is made, then whatever is left over is invested, then
  the investments grow.
*/
export function simulate(options) {
  const debts = options.debts;
  const monthlyInvest = options.monthlyInvest;
  const monthlySave = options.monthlySave;
  const extraToDebt = options.extraToDebt;
  const years = options.years;

  const monthlyReturn = ASSUMED_YEARLY_RETURN / MONTHS_IN_A_YEAR;

  /*
    A working copy of the debts.

    The simulation reduces these balances as it goes, and doing that to the
    caller's own objects would quietly corrupt the real data. Every scenario
    starts from the same untouched figures because of this.
  */
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
        /*
          This debt has finished, so its EMI is no longer leaving the account.
          That money has to go somewhere, and every one of these scenarios sends
          it to investing. This single line is what makes clearing a debt early
          eventually win.
        */
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
        /*
          The final payment is smaller than a full EMI, because there is less
          left than the EMI. Whatever was not needed is invested this month
          rather than vanishing.
        */
        toInvest = toInvest + (payment - debt.balance);
        debt.balance = 0;
        debt.isCleared = true;
      } else {
        debt.balance = debt.balance - payment;
      }
    });

    /*
      Whatever the extra payment could not be spent on.

      Once every debt has cleared there is nothing left to pay it at, and the
      first version of this simply dropped it: eleven thousand rupees a month
      quietly ceased to exist for the remaining fourteen years. That made
      clearing the debt early look catastrophic on the chart, which is the exact
      opposite of the honest comparison this file was written for.

      In real life somebody who finishes paying a debt does not set fire to the
      money. It goes where the freed EMI goes.
    */
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
  Builds the list of choices worth showing this household.

  Not every choice makes sense for everybody, which is the point. Somebody with
  no debt is never offered "clear the debt first", and somebody whose emergency
  fund is already full is not told to keep filling it. An app that shows all
  four to everyone is a brochure; one that shows the two that apply is advice.

    household      { income, dependents, hasLoan, incomeVaries, essentialCosts }
    debts          the real debts
    liquidSavings  cash that could actually be reached in a hurry
    monthsTarget   how many months of cover this household should aim for
    monthlyCosts   what one month costs them

  Every scenario keeps the same "free" money and only moves it between the three
  buckets, so they are genuinely comparable. None of them invents income.
*/
export function buildScenarios(options) {
  const household = options.household;
  const debts = options.debts;

  let totalEmi = 0;
  debts.forEach((debt) => {
    totalEmi = totalEmi + debt.emi;
  });

  const worstDebt = orderByRate(debts)[0];

  const basePlan = buildPlan({
    income: household.income,
    dependents: household.dependents,
    hasLoan: debts.length > 0,
    incomeVaries: household.incomeVaries,
    essentialCosts: household.essentialCosts,
    emi: totalEmi,
    topRate: worstDebt ? worstDebt.annualRate : undefined,
    topDebtName: worstDebt ? worstDebt.name.toLowerCase() : undefined,
  });

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
    /*
      Everything that would have been invested, plus half of the saving, goes at
      the worst debt instead. The other half of the saving stays, because
      stopping saving entirely to clear a debt is how a small emergency turns
      into a new one.
    */
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

  /*
    Play each one out and attach what it leads to.

    The outcomes are what make these comparable. Two splits of the same money
    look almost identical as percentages and end up tens of lakhs apart.
  */
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
  Rewrites a plan so it shows the split somebody actually chose.

  The dashboard builds the recommended plan the way it always has, and then
  passes it through here when a plan has been chosen on /plans. Everything
  downstream, the goals check, the emergency fund, the projection, the
  comparison against the check-ins, reads its numbers out of the plan object,
  so replacing the buckets here is enough to make the whole screen follow the
  choice. Nothing else had to learn about plans.

  Extra sent at a debt is folded into the EMI rather than left as a fourth
  bucket. That is what it becomes the moment somebody commits to this plan:
  money that leaves before any choice is made. It also keeps the three shares
  adding up to what is left, which the card drawing them relies on.

    plan     what buildPlan returned
    chosen   one scenario from buildScenarios

  Returns a new plan. The original is not touched, because a caller that still
  wants the recommended split for comparison should still have it.
*/
export function applyChosenPlan(plan, chosen) {
  const allocation = chosen.allocation;

  const emi = plan.emi + allocation.extraToDebt;
  const free = allocation.spend + allocation.save + allocation.invest;

  /*
    The percentages have to be worked out again from the new amounts. Carrying
    the old ones over would draw bars that disagree with the figures printed
    next to them, which is worse than either being wrong on its own.
  */
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
