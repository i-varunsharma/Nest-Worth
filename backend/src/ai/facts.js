import { checkinRepository } from '../repositories/checkinRepository.js';
import { readFinances } from '../services/financeService.js';
import { bucketAmount, formatRupees } from '../../../shared/plan.js';
import { runStandardShocks } from '../../../shared/shocks.js';

/*
  The snapshot of one person's money that goes into the coach's prompt.

  Everything is read through services/financeService.js, the same data the pages
  use, and every figure is copied from shared/finances.js rather than worked out
  here. It is written as plain lines rather than JSON: a model reads "Credit
  card: ₹84000 still owed at 42% a year" more reliably, and a person can check it
  by eye.
*/

// Each list is capped so one question stays a predictable size. Lists are
// already ordered so the cap keeps what matters most. Totals use every row.
const MAX_ROWS_IN_PROMPT = 20;
const RECENT_CHECKINS = 6;


/* Money is stored as REAL (an EMI can have paise), so round before printing. */
function round(amount) {
  return Math.round(amount);
}

function sumOf(items, field) {
  let total = 0;

  items.forEach((item) => {
    total = total + item[field];
  });

  return total;
}


/*
  Everything the prompt needs. household is null before onboarding, and the
  advice route refuses to ask the model in that case.
*/
export function readFacts(userId) {
  const worked = readFinances(userId);

  if (worked === null) {
    return { household: null };
  }

  const snapshot = worked.snapshot;
  const finances = worked.finances;

  // Assets by value and family by support, largest first, so the cap keeps the biggest.
  const assets = snapshot.assets.slice().sort((a, b) => {
    return b.value - a.value;
  });

  const family = snapshot.family.slice().sort((a, b) => {
    return b.monthlySupport - a.monthlySupport;
  });

  const totalOwed = sumOf(snapshot.debts, 'principal');
  const totalOwned = sumOf(snapshot.assets, 'value');

  return {
    household: snapshot.household,
    debts: snapshot.debts.slice(0, MAX_ROWS_IN_PROMPT),
    goals: snapshot.goals.slice(0, MAX_ROWS_IN_PROMPT),
    assets: assets.slice(0, MAX_ROWS_IN_PROMPT),
    family: family.slice(0, MAX_ROWS_IN_PROMPT),
    checkins: readRecentCheckins(userId),
    finances: finances,
    shocks: runStandardShocks({ finances: finances, family: snapshot.family }),
    totalOwed: round(totalOwed),
    totalEmi: round(sumOf(snapshot.debts, 'emi')),
    totalOwned: round(totalOwned),
    netWorth: round(totalOwned - totalOwed),
  };
}


function readRecentCheckins(userId) {
  return checkinRepository.listRecent(userId, RECENT_CHECKINS);
}


/* The plan section: what the app has already worked out, copied from finances. */
function planLines(finances, shocks) {
  const plan = finances.plan;
  const lines = [];

  lines.push('THE PLAN THE APP HAS WORKED OUT');

  if (finances.followedScenario) {
    lines.push('They chose this plan on the Plans page: ' + finances.followedScenario.name + '.');
  } else {
    lines.push('They follow the split the app recommends.');
  }

  let supportSource = 'estimated from the number of dependents, because the Family page is empty';
  if (finances.family.hasList === true) {
    supportSource = 'the real total from the Family page';
  }

  lines.push('Paid before any choice each month: rent and bills ' + formatRupees(plan.essentialCosts)
    + ', family support ' + formatRupees(plan.support) + ' (' + supportSource + ')'
    + ', EMIs ' + formatRupees(plan.emi) + '.');
  lines.push('Left to decide each month: ' + formatRupees(plan.free) + '. Split: spend '
    + formatRupees(bucketAmount(plan, 'spend')) + ', save ' + formatRupees(bucketAmount(plan, 'save'))
    + ', invest ' + formatRupees(bucketAmount(plan, 'invest')) + '.');
  lines.push('Why the plan looks like this: ' + plan.reasoning.text);
  lines.push('One month of costs: ' + formatRupees(finances.monthlyCosts) + '.');
  lines.push('Cash they can reach quickly: ' + formatRupees(finances.netWorth.liquidAssets)
    + ', which covers ' + finances.safety.monthsCovered.toFixed(1) + ' months against a target of '
    + finances.safety.monthsTarget + ' months.');

  if (finances.family.withoutCover.length > 0) {
    const names = finances.family.withoutCover.map((member) => {
      return member.name;
    });

    lines.push('Family members without health cover: ' + names.join(', ') + '.');
  }

  lines.push('Stress test, with the app\'s default sizes: they get through ' + shocks.survivedCount
    + ' of ' + shocks.total + ' shocks.');

  shocks.results.forEach((result) => {
    let outcome = 'gets through, lowest cash ' + formatRupees(result.lowestCash);

    if (result.verdict === 'breaks') {
      outcome = 'cash runs out in month ' + result.runsOutMonth + ', needs '
        + formatRupees(result.shortfall) + ' more saved';
    } else if (result.verdict === 'tight') {
      outcome = 'only just gets through, lowest cash ' + formatRupees(result.lowestCash);
    }

    lines.push('- ' + result.description + ' Result: ' + outcome + '.');
  });

  return lines;
}


function householdLines(facts) {
  const household = facts.household;
  const lines = ['HOUSEHOLD', 'Take-home income: ₹' + round(household.income) + ' a month'];

  if (facts.family.length === 0) {
    lines.push('People depending on this income: ' + household.dependents
      + ' (a count only; the family page is empty, so support is estimated)');
  } else {
    lines.push('People depending on this income, from the family page:');

    facts.family.forEach((member) => {
      let cover = 'no health cover';
      if (member.hasHealthCover === true) {
        cover = 'has health cover';
      }

      lines.push('- ' + member.name + ' (' + member.relation + '): ₹'
        + round(member.monthlySupport) + ' a month, ' + cover);
    });
  }

  if (household.incomeVaries === true) {
    lines.push('Income changes month to month.');
  } else {
    lines.push('Income is the same every month.');
  }

  if (household.essentialCosts > 0) {
    lines.push('Essential costs (rent, food, bills): ₹' + round(household.essentialCosts) + ' a month');
  } else {
    lines.push('Essential costs: not answered yet.');
  }

  return lines;
}


function debtLines(facts) {
  const lines = ['WHAT THEY OWE'];

  if (facts.debts.length === 0) {
    lines.push('No debts recorded.');
    return lines;
  }

  facts.debts.forEach((debt) => {
    lines.push('- ' + debt.name + ': ₹' + round(debt.principal) + ' still owed at '
      + debt.annualRate + '% a year, EMI ₹' + round(debt.emi) + ' a month');
  });

  lines.push('Total owed: ₹' + facts.totalOwed + '. Total EMI: ₹' + facts.totalEmi + ' a month.');
  lines.push('The list is sorted by interest rate, so the first one is the most expensive.');

  return lines;
}


function assetLines(facts) {
  const lines = ['WHAT THEY OWN'];

  if (facts.assets.length === 0) {
    lines.push('No assets recorded.');
  } else {
    facts.assets.forEach((asset) => {
      lines.push('- ' + asset.name + ' (' + asset.kind + '): ₹' + round(asset.value));
    });

    lines.push('Total owned: ₹' + facts.totalOwned + '.');
  }

  lines.push('Net worth: ₹' + facts.netWorth + '.');

  return lines;
}


function goalLines(facts) {
  const lines = ['WHAT THEY ARE SAVING FOR'];

  if (facts.goals.length === 0) {
    lines.push('No goals recorded.');
    return lines;
  }

  facts.goals.forEach((goal) => {
    lines.push('- ' + goal.name + ': ₹' + round(goal.savedAmount) + ' saved of ₹'
      + round(goal.targetAmount) + ', wanted by ' + goal.targetDate);
  });

  return lines;
}


function checkinLines(facts) {
  const lines = ['RECENT MONTHS'];

  if (facts.checkins.length === 0) {
    lines.push('No months recorded yet.');
    return lines;
  }

  facts.checkins.forEach((checkin) => {
    let line = '- ' + checkin.month + ': earned ₹' + round(checkin.income)
      + ', spent ₹' + round(checkin.spent) + ', saved ₹' + round(checkin.saved)
      + ', invested ₹' + round(checkin.invested);

    // The note often explains a bad month ("sister's wedding") better than the figures.
    if (checkin.note) {
      line = line + '. They wrote: "' + checkin.note + '"';
    }

    lines.push(line);
  });

  return lines;
}


/* The whole snapshot as text, one section after another. */
export function factsToText(facts) {
  // The model's own sense of the date comes from its training, so it is given
  // today's date to judge goal deadlines against.
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const sections = [
    ['TODAY IS ' + today],
    householdLines(facts),
    planLines(facts.finances, facts.shocks),
    debtLines(facts),
    assetLines(facts),
    goalLines(facts),
    checkinLines(facts),
  ];

  const lines = [];

  sections.forEach((section, index) => {
    if (index > 0) {
      lines.push('');
    }

    section.forEach((line) => {
      lines.push(line);
    });
  });

  return lines.join('\n');
}
