import Container from '../shared/Container';
import Reveal from '../shared/Reveal';

/*
  The dark slab. Two columns: what other apps do on the left, what we do on the
  right. The dark background gives the page a change of pace after three pale
  sections in a row.
*/

const comparisons = [
  {
    others: 'A 50/30/20 rule from a country where nobody sends money home',
    ours: 'A split from what is left after your household',
  },
  {
    others: '“Family plan” means linking everyone’s bank accounts',
    ours: 'You describe it. No logins, no statements',
  },
  {
    others: 'A number, and no explanation',
    ours: 'Every number carries its reason',
  },
  {
    others: 'Invest first, worry about the 11% loan later',
    ours: 'Expensive debt clears before you invest a rupee',
  },
];

export default function CompareStrip() {
  return (
    // The outer padding keeps the dark slab from touching the edges of the
    // window, so it reads as a panel rather than a full-width band.
    <section id="difference" className="bg-paper px-4 pb-6 sm:px-6">
      <div className="relative overflow-hidden rounded-[32px] bg-night text-onNight">

        {/* A faint grid, drawn in CSS. See ".grid-texture-dark" in global.css. */}
        <div className="grid-texture-dark pointer-events-none absolute inset-0" aria-hidden="true" />

        <Container className="relative py-20 lg:py-28">
          <div className="grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">

            {/* ---------- Left: the heading ---------- */}
            <div>
              <Reveal>
                <span className="inline-flex items-center gap-2.5 text-2xs font-semibold uppercase tracking-widest2 text-brass">
                  <span className="block h-px w-6 bg-brass/50" />
                  The difference
                </span>
              </Reveal>

              <Reveal delay={80}>
                <h2 className="mt-6 font-display text-[clamp(2.1rem,4vw,3.1rem)] leading-[1.06] tracking-[-0.02em]">
                  Most apps assume you are on your own.
                </h2>
              </Reveal>

              <Reveal delay={150}>
                <p className="mt-6 max-w-xs text-[15.5px] leading-relaxed text-onNight/60">
                  None of them ask who your income supports. That one fact changes the answer.
                </p>
              </Reveal>
            </div>

            {/* ---------- Right: the two columns ---------- */}
            <div>
              <div className="mb-2 grid grid-cols-2 gap-6 border-b border-white/10 pb-3">
                <p className="text-2xs font-semibold uppercase tracking-widest2 text-onNight/35">
                  Everywhere else
                </p>
                <p className="text-2xs font-semibold uppercase tracking-widest2 text-brass">
                  Nestworth
                </p>
              </div>

              {comparisons.map((comparison, index) => {
                return (
                  <Reveal key={comparison.ours} delay={index * 80}>
                    <div className="grid grid-cols-2 gap-6 border-b border-white/10 py-5 transition-colors duration-300 hover:bg-white/[0.03]">

                      {/* The dimmer left half: a small dash instead of a cross,
                          because a row of red crosses feels shouty. */}
                      <p className="flex gap-2.5 text-[13.5px] leading-relaxed text-onNight/55">
                        <span aria-hidden="true" className="mt-1.5 block h-px w-3 shrink-0 bg-paper/30" />
                        {comparison.others}
                      </p>

                      {/* The brighter right half, with a tick. */}
                      <p className="flex gap-2.5 text-[13.5px] leading-relaxed text-onNight/90">
                        <svg viewBox="0 0 16 16" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint" aria-hidden="true">
                          <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.45" />
                          <path
                            d="M4.6 8.2l2.4 2.4 4.4-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        {comparison.ours}
                      </p>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </Container>
      </div>
    </section>
  );
}
