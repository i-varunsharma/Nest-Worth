import { formatRupees } from '../../lib/plan';

/*
  Where the salary actually goes, as four rows with a bar under each.

  It is the same idea as the "where it actually goes" section on the landing
  page, but this version is for someone already signed in: no argument, no
  persuading, just the numbers.

  Props:
    plan       - the object buildPlan() returned
    dependents - how many people are supported, used for the small print
    hasLoan    - whether a loan is running, used for the small print
*/

const barColours = {
  ink: 'bg-ink/45',
  brass: 'bg-brass',
  clay: 'bg-clay',
  accent: 'bg-accent',
};

export default function OutflowCard({ plan, dependents, hasLoan }) {
  // Work the changing sentences out first, so the JSX below stays readable.
  let supportNote = 'Nobody depends on you yet';
  if (dependents === 1) {
    supportNote = '1 person depends on this salary';
  } else if (dependents > 1) {
    supportNote = dependents + ' people depend on this salary';
  }

  let emiNote = 'No loan running';
  if (hasLoan === true) {
    emiNote = 'Clearing this beats investing right now';
  }

  /*
    Living costs only get a row once they have been answered. A zero row would
    read as "you spend nothing on rent", which is worse than saying nothing.
  */
  const rows = [
    { label: 'Take-home income', amount: plan.income, colour: 'ink', note: 'What lands in your account' },
    { label: 'Household support', amount: plan.support, colour: 'brass', note: supportNote },
    { label: 'Education loan EMI', amount: plan.emi, colour: 'clay', note: emiNote },
  ];

  if (plan.essentialCosts > 0) {
    rows.push({
      label: 'Rent, food, bills',
      amount: plan.essentialCosts,
      colour: 'ink',
      note: 'Paid before any choice is made',
    });
  }

  rows.push({
    label: 'Left for you',
    amount: plan.free,
    colour: 'accent',
    note: 'The only number worth planning with',
  });

  return (
    <div id="outflow" className="rounded-[26px] border border-line bg-surface p-6 shadow-card sm:p-8">

      <div className="flex items-center justify-between border-b border-lineSoft pb-4">
        <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">
          Where it actually goes
        </p>
        <p className="text-2xs text-muted">Monthly</p>
      </div>

      <ul className="mt-2">
        {rows.map((row, index) => {
          // How wide this row's bar is, as a share of the whole income.
          const barWidth = (row.amount / plan.income) * 100;

          const isLastRow = index === rows.length - 1;

          // The final row is the important one, so it gets bolder text.
          let labelClasses = 'text-[14.5px] font-medium text-ink2';
          let amountClasses = 'tnum text-[16px] font-semibold text-ink';

          if (isLastRow === true) {
            labelClasses = 'text-[14.5px] font-semibold text-ink';
            amountClasses = 'tnum text-[16px] font-semibold text-accent';
          }

          // A zero amount is greyed out, because there is nothing to see.
          if (row.amount === 0) {
            amountClasses = 'tnum text-[16px] font-semibold text-muted';
          }

          return (
            <li key={row.label} className="border-b border-lineSoft py-5 last:border-0">
              <div className="flex items-baseline justify-between gap-4">
                <p className={labelClasses}>{row.label}</p>
                <p className={amountClasses}>{formatRupees(row.amount)}</p>
              </div>

              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line/70">
                <div
                  className={'h-full rounded-full transition-[width] duration-700 ease-smooth ' + barColours[row.colour]}
                  style={{ width: barWidth + '%' }}
                />
              </div>

              <p className="mt-2.5 text-2xs text-muted">{row.note}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
