import Container from '../shared/Container';
import Eyebrow from '../shared/Eyebrow';
import Reveal from '../shared/Reveal';

/*
  Four cards of different widths, each explaining one decision we made
  differently. Two wide cards and two narrow ones, so the block does not look
  like a spreadsheet.

  Every card shares the same look, kept in cardClasses so that changing the
  hover effect once changes it in all four places.

  "flex flex-col" plus "mt-auto" on the little picture inside each card pushes
  that picture to the bottom, which keeps the cards looking even when one has
  more text than another.
*/
const cardClasses =
  'group relative flex h-full flex-col overflow-hidden rounded-[22px] border border-line '
  + 'bg-surface p-7 transition-all duration-500 ease-smooth '
  + 'hover:-translate-y-1 hover:border-ink/25 hover:shadow-lift';

// The little grey pills on the first card.
const householdInputs = ['Parents', 'Sibling fees', 'Family debt', 'Your EMI', 'Rent home'];

export default function ValueGrid() {
  return (
    <section className="bg-paper">
      <Container className="py-24 lg:py-32">

        {/* ---------- Section heading ---------- */}
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Reveal><Eyebrow>Why it feels different</Eyebrow></Reveal>
            <Reveal delay={80}>
              <h2 className="mt-6 max-w-lg font-display text-[clamp(2.1rem,4vw,3.1rem)] leading-[1.06] tracking-[-0.02em]">
                Advice with your actual life inside it.
              </h2>
            </Reveal>
          </div>

          <Reveal delay={140}>
            <p className="max-w-xs text-[14.5px] leading-relaxed text-muted">
              Four decisions we made differently, because the messy middle is where most people live.
            </p>
          </Reveal>
        </div>

        {/* ---------- The four cards ---------- */}
        {/* On a phone this is one column. From medium screens up it becomes three
            columns, and two of the cards are told to span two of them. */}
        <div className="mt-14 grid gap-5 md:grid-cols-3">

          {/* Card 1: wide */}
          <Reveal className="md:col-span-2">
            <article className={cardClasses}>
              <p className="text-2xs font-semibold uppercase tracking-widest2 text-brass">Household-aware</p>
              <h3 className="mt-3.5 font-display text-[25px] leading-snug tracking-[-0.01em]">
                It asks who your salary carries.
              </h3>
              <p className="mt-3 max-w-md text-[14.5px] leading-relaxed text-ink2">
                Dependents, a sibling&rsquo;s tuition, a loan taken in a parent&rsquo;s name. These are
                the inputs that change the answer, and they are the ones nobody else collects.
              </p>

              <div className="mt-auto flex flex-wrap gap-2.5 pt-8">
                {householdInputs.map((input, index) => {
                  return (
                    <span
                      key={input}
                      className="rounded-full border border-line bg-paper px-3.5 py-1.5 text-[12.5px] text-ink2 transition-all duration-500 ease-smooth group-hover:border-accent/30 group-hover:bg-accentSoft group-hover:text-accentDeep"
                      // Each pill changes colour slightly after the one before it,
                      // so the row lights up left to right on hover.
                      style={{ transitionDelay: index * 60 + 'ms' }}
                    >
                      {input}
                    </span>
                  );
                })}
              </div>
            </article>
          </Reveal>

          {/* Card 2: narrow */}
          <Reveal delay={90}>
            <article className={cardClasses}>
              <p className="text-2xs font-semibold uppercase tracking-widest2 text-brass">Transparent</p>
              <h3 className="mt-3.5 font-display text-[25px] leading-snug tracking-[-0.01em]">
                Ask why. Get a why.
              </h3>
              <p className="mt-3 text-[14.5px] leading-relaxed text-ink2">
                Every number is defensible in one sentence, or it does not ship.
              </p>

              {/* A pretend chat. The question is pushed right with "ml-auto",
                  the answer stays left, which is how messaging apps look. */}
              <div className="mt-auto space-y-2.5 pt-8">
                <div className="ml-auto w-fit rounded-2xl rounded-br-sm bg-ink px-3.5 py-2 text-[12.5px] text-paper">
                  Why so little going into equity?
                </div>
                <div className="w-fit rounded-2xl rounded-bl-sm border border-line bg-paper px-3.5 py-2 text-[12.5px] text-ink2 transition-colors duration-500 group-hover:border-accent/30 group-hover:bg-accentSoft">
                  Your loan costs 11%. Beating it is guaranteed. Beating the market is not.
                </div>
              </div>
            </article>
          </Reveal>

          {/* Card 3: narrow */}
          <Reveal delay={60}>
            <article className={cardClasses}>
              <p className="text-2xs font-semibold uppercase tracking-widest2 text-brass">Private by default</p>
              <h3 className="mt-3.5 font-display text-[25px] leading-snug tracking-[-0.01em]">
                No bank login. Ever.
              </h3>
              <p className="mt-3 text-[14.5px] leading-relaxed text-ink2">
                You describe your situation in ranges. We never touch a statement, a password
                or an account number.
              </p>

              <div className="mt-auto flex items-center gap-3 rounded-2xl border border-line bg-paper p-3.5 transition-colors duration-500 group-hover:border-accent/30 group-hover:bg-accentSoft">
                <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-accent" aria-hidden="true">
                  <path
                    d="M12 2.8l7 3v5.4c0 4.3-2.9 8.2-7 9.5-4.1-1.3-7-5.2-7-9.5V5.8z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8.8 12.2l2.2 2.2 4.2-4.6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p className="text-[12.5px] leading-snug text-ink2">
                  Nothing to breach, because there is nothing stored.
                </p>
              </div>
            </article>
          </Reveal>

          {/* Card 4: wide */}
          <Reveal delay={120} className="md:col-span-2">
            <article className={cardClasses}>
              <p className="text-2xs font-semibold uppercase tracking-widest2 text-brass">Built to be kept</p>
              <h3 className="mt-3.5 font-display text-[25px] leading-snug tracking-[-0.01em]">
                A plan you abandon in March is not a plan.
              </h3>
              <p className="mt-3 max-w-md text-[14.5px] leading-relaxed text-ink2">
                Progress you can see, a streak worth protecting, and a projection that makes the
                boring months feel like they are adding up. Because they are.
              </p>

              <div className="mt-auto grid gap-4 pt-8 sm:grid-cols-[1fr_auto] sm:items-end">

                {/* A progress bar that fills up when you hover the card. */}
                <div>
                  <div className="flex justify-between text-2xs font-medium text-muted">
                    <span>Savings goal</span>
                    <span className="tnum">68%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paperDeep">
                    <div className="h-full w-[22%] rounded-full bg-accent transition-[width] duration-[1200ms] ease-smooth group-hover:w-[68%]" />
                  </div>
                </div>

                {/* Seven small bars, like a week of a streak. The last two are
                    grey until you hover, then they fill in too. */}
                <div className="flex gap-1.5">
                  {[0, 1, 2, 3, 4, 5, 6].map((dayNumber) => {
                    const isAlreadyDone = dayNumber < 5;

                    let dayClasses = 'h-6 w-2.5 rounded-full transition-all duration-500 ease-smooth ';
                    if (isAlreadyDone === true) {
                      dayClasses = dayClasses + 'bg-brass';
                    } else {
                      dayClasses = dayClasses + 'bg-paperDeep group-hover:bg-brass';
                    }

                    return (
                      <span
                        key={dayNumber}
                        className={dayClasses}
                        style={{ transitionDelay: dayNumber * 70 + 'ms' }}
                      />
                    );
                  })}
                </div>
              </div>
            </article>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
