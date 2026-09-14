import Button from '../shared/Button';
import Card from '../shared/Card';
import { formatRupees } from '../../lib/plan';

/*
  The onboarding answers, read-only. Changing them happens in onboarding, so
  there is one form for them rather than two that could disagree.
*/

function Row({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-[14px] text-ink2">{label}</dt>
      <dd className="tnum text-right text-[15px] font-semibold text-ink">{children}</dd>
    </div>
  );
}

export default function HouseholdSection({ household }) {
  let loanAnswer = 'No';
  if (household.hasLoan === true) {
    loanAnswer = 'Yes';
  }

  let incomeAnswer = 'About the same each month';
  if (household.incomeVaries === true) {
    incomeAnswer = 'Varies month to month';
  }

  // Zero means the question was never answered, not that nothing is spent.
  let costsAnswer = 'Not set';
  if (household.essentialCosts > 0) {
    costsAnswer = formatRupees(household.essentialCosts);
  }

  return (
    <Card>
      <h2 className="font-display text-[24px] leading-tight tracking-[-0.01em]">Your household</h2>
      <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink2">The answers everything else is built from.</p>

      <dl className="mt-6 space-y-3 border-t border-lineSoft pt-5">
        <Row label="Monthly take-home">{formatRupees(household.income)}</Row>
        <Row label="People you support">{household.dependents}</Row>
        <Row label="Repaying a loan">{loanAnswer}</Row>
        <Row label="Income pattern">{incomeAnswer}</Row>
        <Row label="Rent, food and bills">{costsAnswer}</Row>
      </dl>

      <div className="mt-7">
        <Button to="/onboarding" variant="secondary" arrow>
          Change these answers
        </Button>
      </div>
    </Card>
  );
}
