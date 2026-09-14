import { Link } from 'react-router-dom';
import { formatRupees } from '../../lib/plan';
import { runShock, verdictSentence } from '../../lib/shocks';

// The bill used for the warning, the same default as the stress test.
const WARNING_BILL = 300000;

/*
  What a hospital bill would do for the first family member without health cover,
  worked out with the stress test's own function. Draws nothing when everyone
  listed has cover.
*/
export default function HealthCoverWarning({ finances, family }) {
  const withoutCover = finances.family.withoutCover;

  if (withoutCover.length === 0) {
    return null;
  }

  const result = runShock({ finances: finances, family: family, shock: { type: 'medical', amount: WARNING_BILL } });

  const othersWithout = withoutCover.length - 1;

  let othersText = '';
  if (othersWithout === 1) {
    othersText = '1 more person has no cover either.';
  } else if (othersWithout > 1) {
    othersText = othersWithout + ' more people have no cover either.';
  }

  let boxClasses = 'border-brass/25 bg-brassSoft';
  if (result.verdict === 'breaks') {
    boxClasses = 'border-clay/25 bg-claySoft';
  }

  return (
    <div className={'mb-6 rounded-[22px] border p-5 sm:p-6 ' + boxClasses}>
      <p className="text-[14.5px] leading-relaxed text-ink2">
        <span className="font-semibold text-ink">{withoutCover[0].name} has no health cover.</span> If a{' '}
        {formatRupees(WARNING_BILL)} hospital bill arrived this month: {verdictSentence(result)}
      </p>

      {othersText !== '' ? <p className="mt-2 text-[13px] text-muted">{othersText}</p> : null}

      <Link to="/stress-test" className="sweep mt-3 inline-block text-[13.5px] font-semibold text-ink">
        Try other amounts in the stress test
      </Link>
    </div>
  );
}
