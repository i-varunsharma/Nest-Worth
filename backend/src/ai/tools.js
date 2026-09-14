import { bestAndWorstMonth, monthlyTrend, overallSummary } from '../reports/insights.js';
import { readFinances, readSnapshot } from '../services/financeService.js';
import { bucketAmount, formatRupees } from '../../../shared/plan.js';
import { extraPaymentEffect, formatDuration, formatMonthYear, payoff } from '../../../shared/debt.js';
import { summariseGoals } from '../../../shared/goals.js';
import { summariseFinances } from '../../../shared/finances.js';
import { runShock, verdictSentence } from '../../../shared/shocks.js';

/*
  The things Claude is allowed to work out for itself.

  This is the part that makes the coach more than a paragraph generator. Rather
  than being handed a fixed set of numbers and asked to talk about them, Claude
  is given a short list of jobs it can ask us to run, and it decides which ones
  it needs. Ask "what if I paid two thousand more on the card" and it calls
  simulate_extra_payment, gets a real payoff date back, and answers from that.

  Two things follow from doing it this way.

  The answers are as right as the app is, because they come from the same
  functions. Every one of these tools calls the code in shared/, which is what
  the dashboard draws its own numbers with. The coach cannot tell you a payoff
  date the debts page disagrees with, because there is only one payoff date.

  And Claude can be asked things nobody wrote a screen for. There is no "what
  if my rent went up by five thousand" page, but the plan model can answer it,
  so the coach can too.

  Each tool is two pieces: a description Claude reads to decide whether it wants
  this one, and a function we run when it does. They are kept next to each other
  so they cannot drift apart.
*/


// A tool that ran away with itself would be expensive. Nothing here needs more.
export const MAX_TOOL_ROUNDS = 5;


// Returned by every tool that needs a plan, for somebody who skipped onboarding.
const NO_HOUSEHOLD = 'This person has not answered the household questions yet, so there is no '
  + 'plan to work from. Suggest they finish setting up first.';


/*
  Finds the debt Claude named.

  It will not always use the exact name that is stored. Asked about "the credit
  card" when the row says "HDFC Regalia", it passes something close rather than
  something identical, so this matches loosely: exact first, then a partial
  match either way round.

  Returns null when nothing matches, and the tool then says so rather than
  guessing at the wrong debt.
*/
function findDebtByName(debts, wanted) {
  if (typeof wanted !== 'string' || wanted.trim().length === 0) {
    return null;
  }

  const search = wanted.trim().toLowerCase();

  for (const debt of debts) {
    if (debt.name.toLowerCase() === search) {
      return debt;
    }
  }

  for (const debt of debts) {
    const name = debt.name.toLowerCase();

    if (name.includes(search) || search.includes(name)) {
      return debt;
    }
  }

  return null;
}


/*
  The same finances as readFinances, with some of the household changed.
  Nothing is saved. This is how the "what if" tool sees a raise or a new
  dependent without touching the real data.

  Returns null when there is no household.
*/
function whatIfFinances(userId, changes) {
  const snapshot = readSnapshot(userId);

  if (snapshot.household === null) {
    return null;
  }

  // A copy, so the real household stays as it was.
  const household = { ...snapshot.household };

  if (Number.isFinite(changes.income) && changes.income > 0) {
    household.income = changes.income;
  }

  if (Number.isFinite(changes.essentialCosts) && changes.essentialCosts >= 0) {
    household.essentialCosts = changes.essentialCosts;
  }

  if (Number.isFinite(changes.dependents) && changes.dependents >= 0) {
    household.dependents = changes.dependents;
  }

  if (Number.isFinite(changes.extraSupport) && changes.extraSupport > 0) {
    household.extraSupport = changes.extraSupport;
  }

  return summariseFinances({
    household: household,
    debts: snapshot.debts,
    assets: snapshot.assets,
    family: snapshot.family,
  });
}


// ---------------------------------------------------------------
// The tools themselves
// ---------------------------------------------------------------

/*
  Each entry has:
    description  what Claude reads when deciding whether it wants this tool
    input_schema what arguments it takes, in JSON Schema
    run          what we actually execute, returning text for Claude to read
    describe     a short line the browser shows while the tool is running

  The descriptions are written for a reader who cannot see this file. Saying
  "runs the payoff simulation" would tell Claude nothing about WHEN to use it,
  which is the only thing it has to decide.
*/
const TOOLS = {

  simulate_extra_payment: {
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
  },


  simulate_household_change: {
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
  },


  check_goals: {
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
  },


  compare_plans: {
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
  },


  spending_trend: {
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
  },


  emergency_fund: {
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
  },


  stress_test: {
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
  },
};


/*
  The list in the shape the Claude API wants: name, description, input_schema.
  The run and describe functions are ours and stay on this side.
*/
export function toolDefinitions() {
  const list = [];

  for (const name of Object.keys(TOOLS)) {
    list.push({
      name: name,
      description: TOOLS[name].description,
      input_schema: TOOLS[name].input_schema,
    });
  }

  return list;
}


/* A short line for the browser to show while a tool runs. */
export function describeTool(name, input) {
  const tool = TOOLS[name];

  if (!tool) {
    return 'Working';
  }

  return tool.describe(input);
}


/*
  Runs one tool and returns text for Claude to read.

  A tool that throws must not take the whole answer down with it. Claude is
  told what went wrong instead, and can say so or try something else, which is
  a far better outcome than a blank card.
*/
export function runTool(userId, name, input) {
  const tool = TOOLS[name];

  if (!tool) {
    return 'There is no tool called ' + name + '.';
  }

  let safeInput = input;
  if (!safeInput || typeof safeInput !== 'object') {
    safeInput = {};
  }

  try {
    return tool.run(userId, safeInput);
  } catch (error) {
    console.error('Tool ' + name + ' failed:', error);
    return 'That calculation failed. Tell the person you could not work it out.';
  }
}
