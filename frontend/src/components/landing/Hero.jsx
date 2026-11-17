import Button from '../shared/Button';
import Container from '../shared/Container';
import Reveal from '../shared/Reveal';
import Planner from './Planner';
import { DEFAULT_SUPPORT_PER_PERSON, DEFAULT_EMI } from '../../lib/plan';
import { formatRupees } from '../../lib/format';

/*
  The first thing anyone sees. Headline and buttons on the left, the working
  planner card on the right.

  The household numbers are passed straight through to the Planner. The Hero
  itself does not care what they are.
*/

// The three short promises under the buttons.
const promises = ['No bank login', 'About 3 minutes', 'Free while in beta'];

export default function Hero({ household, onHouseholdChange }) {
  return (
    // "relative" lets the decorative layers below sit on top of this section,
    // and "overflow-hidden" stops the wide glow from causing sideways scrolling.
    <section className="relative overflow-hidden">

      {/* Three decorative layers. None of them mean anything, so they are all
          hidden from screen readers and ignore mouse clicks. */}
      <div className="grid-texture pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[620px] w-[900px] -translate-x-1/2 rounded-full opacity-70 blur-3xl"
        style={{
          background:
            'radial-gradient(closest-side, rgba(31,83,64,0.16), rgba(169,124,44,0.10), transparent)',
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-paper"
        aria-hidden="true"
      />

      <Container className="relative pb-24 pt-14 lg:pb-32 lg:pt-20">
        {/* grid-cols-1 matters on a phone. Without it the single column grows to
            fit its widest content and pushes the hero past the screen edge. */}
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-[1.03fr_0.97fr] lg:items-start lg:gap-16">

          {/* ---------- Left column: the words ---------- */}
          <div>
            <Reveal>
              <span className="inline-flex items-center gap-2.5 rounded-full border border-line bg-surface/70 px-3.5 py-1.5 text-2xs font-semibold uppercase tracking-widest2 text-ink2 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                Built for Indian households
              </span>
            </Reveal>

            <Reveal delay={90}>
              {/* clamp(smallest, preferred, largest) lets the heading shrink on a
                  phone and grow on a monitor without needing separate classes. */}
              <h1 className="mt-7 font-display text-[clamp(2.35rem,7.2vw,4.6rem)] font-normal leading-[0.98] tracking-[-0.02em]">
                {/* JSX drops line breaks between text and a tag, so the {' '}
                    spaces are needed or screen readers hear "wasneverjust". */}
                Your net worth was{' '}
                <span className="relative mx-1 inline-block italic text-accent">
                  never
                  {/* A hand-drawn looking underline, made from a single curved line. */}
                  <svg
                    viewBox="0 0 200 12"
                    preserveAspectRatio="none"
                    className="absolute -bottom-1 left-0 h-2.5 w-full text-accent/30"
                    aria-hidden="true"
                  >
                    <path d="M2 8C46 3 152 2 198 6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </span>{' '}
                just yours.
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <p className="mt-7 max-w-md text-[17.5px] leading-relaxed text-ink2">
                Other apps assume your salary is yours alone. We start with who it has to carry.
              </p>
            </Reveal>

            <Reveal delay={230}>
              <div className="mt-9 flex flex-wrap gap-3">
                <Button to="/signup" variant="accent" arrow>Get your plan</Button>
                <Button href="#how" variant="outline">See how it works</Button>
              </div>
            </Reveal>

            <Reveal delay={300}>
              <ul className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-2.5">
                {promises.map((promise) => {
                  return (
                    <li key={promise} className="flex items-center gap-2 text-[13px] text-muted">
                      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-accent" aria-hidden="true">
                        <path
                          d="M3.5 8.4l3 3 6-6.6"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      {promise}
                    </li>
                  );
                })}
              </ul>
            </Reveal>
          </div>

          {/* ---------- Right column: the working card ---------- */}
          <Reveal delay={160} className="lg:pl-4 lg:pt-2">
            <Planner household={household} onChange={onHouseholdChange} />
            <p className="mt-9 text-center text-[12.5px] text-muted">
              The real model, with typical amounts for support
              ({formatRupees(DEFAULT_SUPPORT_PER_PERSON)} a person) and EMI ({formatRupees(DEFAULT_EMI)}).
              Your plan uses yours.
            </p>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
