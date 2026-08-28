import Button from '../shared/Button';
import Container from '../shared/Container';
import Reveal from '../shared/Reveal';
import Planner from './Planner';

const assurances = ['No bank login', 'About 3 minutes', 'Free while in beta'];

export default function Hero({ state, onChange }) {
  return (
    <section className="relative overflow-hidden">
      <div className="grid-texture pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[620px] w-[900px] -translate-x-1/2 rounded-full opacity-70 blur-3xl"
        style={{ background: 'radial-gradient(closest-side, rgba(31,83,64,0.16), rgba(169,124,44,0.10), transparent)' }}
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-paper" aria-hidden="true" />

      <Container className="relative pb-24 pt-14 lg:pb-32 lg:pt-20">
        <div className="grid items-center gap-14 lg:grid-cols-[1.03fr_0.97fr] lg:items-start lg:gap-16">
          <div>
            <Reveal>
              <span className="inline-flex items-center gap-2.5 rounded-full border border-line bg-surface/70 px-3.5 py-1.5 text-2xs font-semibold uppercase tracking-widest2 text-ink2 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                Built for Indian households
              </span>
            </Reveal>

            <Reveal delay={90}>
              <h1 className="mt-7 font-display text-[clamp(2.35rem,7.2vw,4.6rem)] font-normal leading-[0.98] tracking-[-0.02em]">
                Your net worth was
                <span className="relative mx-3 inline-block italic text-accent">
                  never
                  <svg viewBox="0 0 200 12" preserveAspectRatio="none" className="absolute -bottom-1 left-0 h-2.5 w-full text-accent/30" aria-hidden="true">
                    <path d="M2 8C46 3 152 2 198 6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </span>
                just yours.
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <p className="mt-7 max-w-lg text-[17px] leading-relaxed text-ink2">
                Every budgeting app assumes your salary is yours alone. Nestworth starts from
                your household — the dependents, the fees, the family debt — and only then tells
                you what to spend, save and invest. With the reasoning shown for every number.
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
                {assurances.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-[13px] text-muted">
                    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-accent" aria-hidden="true">
                      <path d="M3.5 8.4l3 3 6-6.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={360}>
              <a href="#household" className="group mt-14 hidden items-center gap-4 border-t border-line pt-7 lg:flex">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line transition-all duration-500 ease-smooth group-hover:border-ink group-hover:bg-ink group-hover:text-paper">
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 transition-transform duration-500 ease-smooth group-hover:translate-y-0.5" aria-hidden="true">
                    <path d="M8 2.5v11M3.5 9.5L8 14l4.5-4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span>
                  <span className="block text-2xs font-semibold uppercase tracking-widest2 text-muted">Keep reading</span>
                  <span className="sweep mt-1 block text-[14.5px] font-medium text-ink">See where the money actually goes</span>
                </span>
              </a>
            </Reveal>
          </div>

          <Reveal delay={160} className="lg:pl-4 lg:pt-2">
            <Planner state={state} onChange={onChange} />
            <p className="mt-9 text-center text-[12.5px] text-muted">
              This is the real model. Move the slider and watch the reasoning change.
            </p>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
