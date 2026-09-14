import { Link } from 'react-router-dom';

/*
  How many of the four standard shocks this household gets through.

  A plan for a normal month says nothing about a bad one. This card is a short
  answer to "what if something goes wrong", and it links to the stress test page
  where each shock can be changed and looked at month by month.

  Props:
    summary       - what runStandardShocks returned
    familyListed  - false until the family page has people on it
*/

// One small dot per shock, coloured by its verdict.
const verdictDots = {
  safe: 'bg-accent',
  tight: 'bg-brass',
  breaks: 'bg-clay',
};

const verdictWords = {
  safe: 'Gets through',
  tight: 'Only just',
  breaks: 'Runs out',
};

export default function ResilienceCard({ summary, familyListed }) {
  // The headline colour follows the worst case: any shock that breaks is clay.
  let headlineColour = 'text-accent';
  if (summary.survivedCount < summary.total) {
    headlineColour = 'text-clay';
  }

  let footnote = 'Assumes investing pauses and everyday spending halves during a bad month.';
  if (familyListed === false) {
    footnote = 'Add the people you support on the Family page to make the hospital bill test real.';
  }

  return (
    <Link
      to="/stress-test"
      className="group block rounded-[26px] border border-line bg-surface p-6 shadow-card transition-all duration-300 ease-smooth hover:-translate-y-0.5 hover:border-ink/25 hover:shadow-lift sm:p-7"
    >
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">If something goes wrong</p>
        <span className="text-2xs font-semibold uppercase tracking-widest2 text-ink2">
          Stress test
          <span aria-hidden="true" className="ml-1.5 inline-block transition-transform duration-300 group-hover:translate-x-0.5">
            &#8594;
          </span>
        </span>
      </div>

      <p className="mt-4 font-display text-[26px] leading-tight">
        <span className={'tnum ' + headlineColour}>
          {summary.survivedCount} of {summary.total}
        </span>{' '}
        shocks survived
      </p>

      <ul className="mt-5 grid gap-x-8 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {summary.results.map((result) => {
          const dotClasses = 'h-2 w-2 shrink-0 rounded-full ' + verdictDots[result.verdict];

          return (
            <li key={result.shock.type} className="flex items-center justify-between gap-3 rounded-xl border border-lineSoft px-3.5 py-2.5">
              <span className="flex items-center gap-2.5 text-[14px] text-ink2">
                <span aria-hidden="true" className={dotClasses} />
                {result.title}
              </span>
              <span className="text-2xs font-semibold text-muted">{verdictWords[result.verdict]}</span>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 border-t border-lineSoft pt-3.5 text-2xs leading-relaxed text-muted">{footnote}</p>
    </Link>
  );
}
