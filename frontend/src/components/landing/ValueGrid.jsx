import Container from '../shared/Container';
import Eyebrow from '../shared/Eyebrow';
import Reveal from '../shared/Reveal';

// Four cards of mixed widths, each showing one thing the product does differently.
// mt-auto on each card's picture keeps the pictures aligned at the bottom.
const cardClasses =
  'group relative flex h-full flex-col overflow-hidden rounded-[22px] border border-line '
  + 'bg-surface p-7 transition-all duration-500 ease-smooth '
  + 'hover:-translate-y-1 hover:border-ink/25 hover:shadow-lift';

// The little grey pills on the first card.
const householdInputs = ['Papa\'s medicines', 'Sister\'s fees', 'Nani, no health cover', 'Your EMI', 'Rent'];

// The bars in the stress test card: cash falling below zero and climbing back.
const runwayBars = [
  { month: 0, height: 26, isBelowZero: false },
  { month: 1, height: 12, isBelowZero: false },
  { month: 2, height: 6, isBelowZero: true },
  { month: 3, height: 16, isBelowZero: true },
  { month: 4, height: 26, isBelowZero: true },
  { month: 5, height: 14, isBelowZero: true },
  { month: 6, height: 5, isBelowZero: true },
  { month: 7, height: 8, isBelowZero: false },
];

export default function ValueGrid() {
  return (
    <section className="bg-paper">
      <Container className="py-24 lg:py-32">

        {/* ---------- Section heading ---------- */}
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Reveal><Eyebrow>Why it feels different</Eyebrow></Reveal>
            <Reveal delay={80}>
              <h2 className="mt-6 max-w-md font-display text-[clamp(2.1rem,4vw,3.1rem)] leading-[1.06] tracking-[-0.02em]">
                Four things we do differently.
              </h2>
            </Reveal>
          </div>

          <Reveal delay={140}>
            <p className="max-w-[15rem] text-[14.5px] leading-relaxed text-muted">
              The messy middle is where most people live.
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
              <p className="mt-3 max-w-sm text-[14.5px] leading-relaxed text-ink2">
                Name the people you support and what each one costs. The plan uses the real
                amounts, not a guess.
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
              <p className="text-2xs font-semibold uppercase tracking-widest2 text-brass">AI coach</p>
              <h3 className="mt-3.5 font-display text-[25px] leading-snug tracking-[-0.01em]">
                Ask why. Get a why.
              </h3>
              <p className="mt-3 text-[14.5px] leading-relaxed text-ink2">
                One sentence per number, or it does not ship.
              </p>

              {/* A sample of the real thing. On the dashboard this card is
                  wired to a real model, which answers from your own numbers. */}
              <div className="mt-auto space-y-2.5 pt-8">
                <div className="ml-auto w-fit rounded-2xl rounded-br-sm bg-ink px-3.5 py-2 text-[12.5px] text-paper">
                  Why so little going into equity?
                </div>
                <div className="w-fit rounded-2xl rounded-bl-sm border border-line bg-paper px-3.5 py-2 text-[12.5px] text-ink2 transition-colors duration-500 group-hover:border-accent/30 group-hover:bg-accentSoft">
                  Your loan costs 11%. Beating that is guaranteed. Beating the market is not.
                </div>
              </div>
            </article>
          </Reveal>

          {/* Card 3: narrow */}
          <Reveal delay={60}>
            <article className={cardClasses}>
              <p className="text-2xs font-semibold uppercase tracking-widest2 text-brass">Stress tested</p>
              <h3 className="mt-3.5 font-display text-[25px] leading-snug tracking-[-0.01em]">
                What if the salary stops?
              </h3>
              <p className="mt-3 text-[14.5px] leading-relaxed text-ink2">
                A job loss, a pay cut, a hospital bill. See the month your cash runs out, and what fixes it.
              </p>

              {/* Space between the words and the picture, the same as the other cards. */}
              <div className="pt-8" />

              {/* A small picture of the runway chart. Each column has a top half
                  for cash above zero and a bottom half for below zero. The
                  bars below zero turn clay on hover, as the real chart marks them. */}
              <div className="mt-auto flex h-16 gap-1.5" aria-hidden="true">
                {runwayBars.map((bar) => {
                  const barStyle = { height: bar.height + 'px', transitionDelay: bar.month * 50 + 'ms' };

                  let above = null;
                  let below = null;

                  if (bar.isBelowZero === true) {
                    below = (
                      <span
                        className="w-full rounded-sm bg-ink/15 transition-colors duration-500 ease-smooth group-hover:bg-clay"
                        style={barStyle}
                      />
                    );
                  } else {
                    above = <span className="w-full rounded-sm bg-brass" style={barStyle} />;
                  }

                  return (
                    <div key={bar.month} className="flex h-16 flex-1 flex-col">
                      <div className="flex flex-1 items-end">{above}</div>
                      <div className="h-px bg-line" />
                      <div className="flex flex-1 items-start">{below}</div>
                    </div>
                  );
                })}
              </div>
            </article>
          </Reveal>

          {/* Card 4: wide */}
          <Reveal delay={120} className="md:col-span-2">
            <article className={cardClasses}>
              <p className="text-2xs font-semibold uppercase tracking-widest2 text-brass">Built to be kept</p>
              <h3 className="mt-3.5 font-display text-[25px] leading-snug tracking-[-0.01em]">
                A plan you drop in March is not a plan.
              </h3>
              <p className="mt-3 max-w-sm text-[14.5px] leading-relaxed text-ink2">
                Progress you can see, and a streak worth protecting.
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
