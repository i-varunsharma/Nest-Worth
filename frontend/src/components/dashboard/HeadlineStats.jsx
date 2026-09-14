import { Link } from 'react-router-dom';
import CountUp from '../shared/CountUp';
import Overline from '../shared/Overline';
import { formatDuration, formatMonthYear } from '../../lib/debt';
import { summariseGoals } from '../../lib/goals';
import { bucketAmount, formatRupees } from '../../lib/plan';

/*
  The four figures across the top of the dashboard, each a link to its page.

  A figure that is a number counts up to itself; a date or a word is shown as
  it is, because counting towards "March 2027" means nothing.
*/

function formatShortRupees(amount) {
  return formatRupees(amount, { short: true });
}

function formatMonths(months) {
  return months.toFixed(1) + ' mo';
}

function debtHeadline(finances, hasDebts) {
  const summary = finances.debtSummary;

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

export default function HeadlineStats({ finances, goals, hasDebts }) {
  const netWorth = finances.netWorth;
  const safety = finances.safety;
  const debt = debtHeadline(finances, hasDebts);
  const goal = goalHeadline(finances, goals);

  const headlines = [
    {
      to: '/net-worth',
      label: 'Net worth',
      countTo: netWorth.netWorth,
      format: formatShortRupees,
      note: formatShortRupees(netWorth.totalAssets) + ' owned, ' + formatShortRupees(netWorth.totalDebts) + ' owed',
      isNegative: netWorth.netWorth < 0,
    },
    { to: '/debts', label: 'Debt free', value: debt.value, note: debt.note, isNegative: debt.isNegative },
    {
      to: '/net-worth',
      label: 'Safety net',
      countTo: safety.monthsCovered,
      format: formatMonths,
      note: 'target ' + safety.monthsTarget + ' months',
      isNegative: safety.isEnough === false,
    },
    { to: '/goals', label: 'Goals', value: goal.value, note: goal.note, isNegative: goal.isNegative },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            className="group rounded-[18px] border border-line bg-surface p-5 shadow-card transition-all duration-300 ease-smooth hover:-translate-y-0.5 hover:border-ink/25 hover:shadow-lift"
          >
            <Overline>{item.label}</Overline>
            <p className={'tnum mt-2.5 font-display text-[28px] leading-none ' + valueColour}>{valueContent}</p>
            <p className="mt-2 text-2xs text-muted">{item.note}</p>
          </Link>
        );
      })}
    </div>
  );
}
