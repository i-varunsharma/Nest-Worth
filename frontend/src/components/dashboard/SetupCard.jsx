import { Link } from 'react-router-dom';
import Card from '../shared/Card';
import Overline from '../shared/Overline';
import { formatRupees } from '../../lib/format';
import { DEFAULT_EMI, DEFAULT_SUPPORT_PER_PERSON } from '../../lib/plan';

/*
  The figures still running on an estimate, each with a link to fix it.

  A new account starts with guesses (a default EMI, a per person support cost).
  Showing those guesses as if they were real, in red, made a first visit look
  like bad news. This card says which numbers are guesses instead, and goes
  away once none are left.

  Props:
    finances   from summariseFinances
    hasAssets  true once anything is on the Net worth page
*/
export default function SetupCard({ finances, hasAssets }) {
  const steps = [];

  if (finances.loanDetailsMissing === true) {
    steps.push({
      to: '/debts',
      label: 'Add your loan',
      note: 'Its rate and EMI. Until then the plan assumes ' + formatRupees(DEFAULT_EMI) + ' a month.',
    });
  }

  // Either nobody is listed yet, or fewer people than onboarding counted.
  let peopleToList = finances.peopleNotListed;
  if (finances.family.hasList === false) {
    peopleToList = finances.dependents;
  }

  if (peopleToList > 0) {
    let who = peopleToList + ' people';
    if (peopleToList === 1) {
      who = '1 person';
    }

    steps.push({
      to: '/family',
      label: 'Name the people you support',
      note: who + ' still counted at an estimated ' + formatRupees(DEFAULT_SUPPORT_PER_PERSON) + ' each.',
    });
  }

  if (hasAssets === false) {
    steps.push({
      to: '/net-worth',
      label: 'Add your savings',
      note: 'Cash and FDs decide your safety net and how the stress test ends.',
    });
  }

  if (steps.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6">
      <Overline>Still estimated</Overline>
      <p className="mt-2 text-[14.5px] leading-relaxed text-ink2">
        These numbers are guesses for now. Each one takes under a minute to make real.
      </p>

      <ul className="mt-4 divide-y divide-lineSoft border-t border-lineSoft">
        {steps.map((step) => {
          return (
            <li key={step.to}>
              <Link to={step.to} className="group flex items-center justify-between gap-4 py-3.5">
                <span>
                  <span className="block text-[14.5px] font-semibold text-ink">{step.label}</span>
                  <span className="mt-0.5 block text-[13px] text-muted">{step.note}</span>
                </span>
                <span aria-hidden="true" className="text-ink2 transition-transform duration-300 group-hover:translate-x-0.5">
                  &#8594;
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
