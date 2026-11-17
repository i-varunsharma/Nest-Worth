import { Link } from 'react-router-dom';
import CountUp from '../shared/CountUp';
import Overline from '../shared/Overline';
import { summariseGoals } from '../../lib/goals';
import { bucketAmount } from '../../lib/plan';
import { formatDuration, formatMonthYear, formatRupeesShort } from '../../lib/format';

/*
  The four figures across the top of the dashboard, each a link to its page.

  A figure that is a number counts up to itself; a date or a word is shown as
  it is, because counting towards "March 2027" means nothing.
*/

function formatMonths(months) {
  return months.toFixed(1) + ' mo';
}

function debtHeadline(finances, hasDebts) {
  const summary = finances.debtSummary;

  // Onboarding said a loan is running, but it has not been added yet.
  if (finances.loanDetailsMissing === true) {
    return { value: 'Not set', note: 'add your loan', isNegative: false };
  }

  if (hasDebts === false) {
    return { value: 'Now', note: 'Nothing owed', isNegative: false };
  }

  // A debt that never clears has no date, and longestMonths ignores it.
  if (summary.everythingClears === false) {
    return { value: 'Not yet', note: 'one debt never clears', isNegative: true };
  }

  return {
    value: formatMonthYear(summary.debtFreeDate),
    note: formatDuration(summary.longestMonths) + ' away',
    isNegative: false,
  };
}

function goalHeadline(finances, goals) {
  if (goals.length === 0) {
    return { value: 'None yet', note: 'Add your first', isNegative: false };
  }

  const summary = summariseGoals(goals, bucketAmount(finances.plan, 'save'));

  if (summary.isAffordable === true) {
    return { value: String(goals.length), note: 'all affordable', isNegative: false };
  }

  return { value: String(goals.length), note: 'over budget', isNegative: true };
}

/*
  With nothing on the Net worth page the app does not know the savings, so it
  says "Not set" rather than a red 0.0 months that may well be wrong.
*/
function safetyHeadline(safety, hasAssets) {
  if (hasAssets === false) {
    return { value: 'Not set', note: 'add your savings', isNegative: false };
  }

  return {
    countTo: safety.monthsCovered,
    format: formatMonths,
    note: 'target ' + safety.monthsTarget + ' months',
    isNegative: safety.isEnough === false,
  };
}

export default function HeadlineStats({ finances, goals, hasDebts, hasAssets }) {
  const netWorth = finances.netWorth;
  const safety = finances.safety;
  const debt = debtHeadline(finances, hasDebts);
  const goal = goalHeadline(finances, goals);
  const safetyFigure = safetyHeadline(safety, hasAssets);

  const headlines = [
    {
      to: '/net-worth',
      label: 'Net worth',
      countTo: netWorth.netWorth,
      format: formatRupeesShort,
      note: formatRupeesShort(netWorth.totalAssets) + ' owned, ' + formatRupeesShort(netWorth.totalDebts) + ' owed',
      isNegative: netWorth.netWorth < 0,
    },
    { to: '/debts', label: 'Debt free', value: debt.value, note: debt.note, isNegative: debt.isNegative },
    { to: '/net-worth', label: 'Safety net', ...safetyFigure },
    { to: '/goals', label: 'Goals', value: goal.value, note: goal.note, isNegative: goal.isNegative },
  ];

  return (
    // Two across even on a phone. One per row made the four tiles fill the
    // whole first screen and pushed the plan below the fold.
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {headlines.map((item) => {
        let valueColour = 'text-accent';
        if (item.isNegative === true) {
          valueColour = 'text-clay';
        }

        let valueContent = item.value;
        if (item.countTo !== undefined) {
          valueContent = <CountUp to={item.countTo} format={item.format} />;
        }

        return (
          <Link
            key={item.label}
            to={item.to}
            className="group rounded-[18px] border border-line bg-surface p-4 shadow-card sm:p-5 transition-all duration-300 ease-smooth hover:-translate-y-0.5 hover:border-ink/25 hover:shadow-lift"
          >
            <Overline>{item.label}</Overline>
            <p className={'tnum mt-2.5 font-display text-[22px] leading-none sm:text-[28px] ' + valueColour}>{valueContent}</p>
            <p className="mt-2 text-2xs text-muted">{item.note}</p>
          </Link>
        );
      })}
    </div>
  );
}
