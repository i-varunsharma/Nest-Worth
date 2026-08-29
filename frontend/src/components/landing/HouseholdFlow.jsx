import Container from '../shared/Container';
import Eyebrow from '../shared/Eyebrow';
import Reveal from '../shared/Reveal';
import useReveal from '../../hooks/useReveal';
import { buildPlan, formatRupees } from '../../lib/plan';

/*
  HouseholdFlow
  -------------
  The "where does the money actually go" section.

  It reads the same household the hero planner is using, so if the reader moved
  the slider up there, these four rows have already changed to match.

  The bars grow out from zero the first time the card scrolls into view, which is
  why this file uses useReveal directly instead of only the Reveal wrapper.
*/

// The colour of each bar. The keys match the "colour" value on each row below.
const barColours = {
  ink: 'bg-ink/45',
  brass: 'bg-brass',
  clay: 'bg-clay',
  accent: 'bg-accent',
};

export default function HouseholdFlow({ household }) {
  const plan = buildPlan(household);

  // cardRef goes on the card, isCardVisible turns true once it is on screen.
  const [cardRef, isCardVisible] = useReveal();

  // Build the four rows. Some of the small print changes with the household,
  // so we work those sentences out first rather than inside the JSX.
  let supportNote = '2 people depend on this salary';
  if (household.dependents === 0) {
    supportNote = 'Nobody depends on you yet';
  } else if (household.dependents === 1) {
    supportNote = '1 person depends on this salary';
  } else {
    supportNote = household.dependents + ' people depend on this salary';
  }

  let emiNote = 'No loan running';
  if (household.hasLoan === true) {
    emiNote = 'Started before the first payslip did';
  }

  const rows = [
    { label: 'Take-home income', amount: plan.income, colour: 'ink', note: 'What the offer letter promised' },
    { label: 'Household support', amount: plan.support, colour: 'brass', note: supportNote },
    { label: 'Education loan EMI', amount: plan.emi, colour: 'clay', note: emiNote },
    { label: 'Left for you', amount: plan.free, colour: 'accent', note: 'The only number worth planning with' },
  ];

  return (
    <section id="household" className="border-y border-line bg-paperDeep">
      <Container className="py-24 lg:py-32">
        <div className="grid gap-14 lg:grid-cols-2 lg:gap-20">

          {/* ---------- Left: the argument ---------- */}
          {/* "sticky" makes this column stay put while the card scrolls past it. */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Reveal><Eyebrow>The problem</Eyebrow></Reveal>

            <Reveal delay={80}>
              <h2 className="mt-6 max-w-md font-display text-[clamp(2.1rem,4vw,3.1rem)] leading-[1.06] tracking-[-0.02em]">
                The money leaves before the advice arrives.
              </h2>
            </Reveal>

            <Reveal delay={150}>
              <p className="mt-6 max-w-md text-[16px] leading-relaxed text-ink2">
                By the time you open a budgeting app, a third of the salary is already spoken for.
                Rent sent home. A sibling&rsquo;s semester fee. An EMI that started before the
                first payslip did.
              </p>
            </Reveal>

            <Reveal delay={210}>
              <p className="mt-4 max-w-md text-[16px] leading-relaxed text-ink2">
                Advice that ignores all of that is not advice. It is arithmetic for
                somebody else&rsquo;s life.
              </p>
            </Reveal>

            <Reveal delay={270}>
              <div className="mt-9 border-l-2 border-accent pl-5">
                <p className="font-display text-[20px] italic leading-snug text-ink">
                  &ldquo;Fifty-thirty-twenty assumes the fifty is yours to spend.&rdquo;
                </p>
              </div>
            </Reveal>
          </div>

          {/* ---------- Right: the statement card ---------- */}
          <div ref={cardRef}>
            <div className="rounded-[26px] border border-line bg-surface p-6 shadow-card sm:p-8">

              <div className="flex items-center justify-between border-b border-lineSoft pb-4">
                <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">
                  Where it actually goes
                </p>
                <p className="text-2xs text-muted">Monthly</p>
              </div>

              <ul className="mt-2">
                {rows.map((row, index) => {
                  // How wide this row's bar should be, as a percentage of income.
                  const fullWidth = (row.amount / plan.income) * 100;

                  // Before the card is on screen every bar sits at zero width.
                  // Once it appears they grow to their real width, one after another.
                  let barWidth = '0%';
                  if (isCardVisible === true) {
                    barWidth = fullWidth + '%';
                  }

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
                          className={'h-full rounded-full transition-[width] duration-[900ms] ease-smooth ' + barColours[row.colour]}
                          style={{
                            width: barWidth,
                            // Each bar starts a little later than the one above it.
                            transitionDelay: index * 110 + 'ms',
                          }}
                        />
                      </div>

                      <p className="mt-2.5 text-2xs text-muted">{row.note}</p>
                    </li>
                  );
                })}
              </ul>
            </div>
            
            <p className="mt-5 text-center text-[12.5px] text-muted lg:text-left">
              Still following the numbers you set in the planner above.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
