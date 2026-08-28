import { useRef } from 'react';
import Container from '../shared/Container';
import Reveal from '../shared/Reveal';

const rows = [
  { bad: 'A 50/30/20 rule imported from a country where nobody sends money home', good: 'A split derived from what is left after your household is looked after' },
  { bad: '“Family plan” means linking everyone’s bank accounts', good: 'You describe the situation. No logins, no statements, no scraping' },
  { bad: 'A number, and no explanation for it', good: 'Every number carries the sentence that produced it' },
  { bad: 'Invest first, worry about the 11% loan later', good: 'Debt that outruns the market gets cleared before you invest a rupee' },
];

export default function CompareStrip() {
  const ref = useRef(null);

  const onPointerMove = (event) => {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    node.style.setProperty('--x', `${event.clientX - rect.left}px`);
    node.style.setProperty('--y', `${event.clientY - rect.top}px`);
  };

  return (
    <section id="difference" className="bg-paper px-4 pb-6 sm:px-6">
      <div
        ref={ref}
        onPointerMove={onPointerMove}
        className="group relative overflow-hidden rounded-[32px] bg-night text-paper"
      >
        <div className="grid-texture-dark pointer-events-none absolute inset-0" aria-hidden="true" />
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{ background: 'radial-gradient(340px circle at var(--x, 50%) var(--y, 50%), rgba(169,124,44,0.16), transparent 70%)' }}
          aria-hidden="true"
        />

        <Container className="relative py-20 lg:py-28">
          <div className="grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
            <div>
              <Reveal>
                <span className="inline-flex items-center gap-2.5 text-2xs font-semibold uppercase tracking-widest2 text-brass">
                  <span className="block h-px w-6 bg-brass/50" />
                  The difference
                </span>
              </Reveal>
              <Reveal delay={80}>
                <h2 className="mt-6 font-display text-[clamp(2.1rem,4vw,3.1rem)] leading-[1.06] tracking-[-0.02em]">
                  Every other app assumes you are on your own.
                </h2>
              </Reveal>
              <Reveal delay={150}>
                <p className="mt-6 max-w-sm text-[15.5px] leading-relaxed text-paper/60">
                  Budgeting apps track transactions. Investment apps ask five generic questions.
                  None of them ask whether your income supports anyone besides you — and that
                  single fact changes everything about what you should do with it.
                </p>
              </Reveal>
            </div>

            <div>
              <div className="mb-2 grid grid-cols-2 gap-6 border-b border-white/10 pb-3">
                <p className="text-2xs font-semibold uppercase tracking-widest2 text-paper/35">Everywhere else</p>
                <p className="text-2xs font-semibold uppercase tracking-widest2 text-brass">Nestworth</p>
              </div>
              {rows.map((row, index) => (
                <Reveal key={row.good} delay={index * 80}>
                  <div className="grid grid-cols-2 gap-6 border-b border-white/10 py-5 transition-colors duration-300 hover:bg-white/[0.03]">
                    <p className="flex gap-2.5 text-[13.5px] leading-relaxed text-paper/55">
                      <span aria-hidden="true" className="mt-1.5 block h-px w-3 shrink-0 bg-paper/30" />
                      {row.bad}
                    </p>
                    <p className="flex gap-2.5 text-[13.5px] leading-relaxed text-paper/90">
                      <svg viewBox="0 0 16 16" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint" aria-hidden="true">
                        <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.45" />
                        <path d="M4.6 8.2l2.4 2.4 4.4-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {row.good}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </Container>
      </div>
    </section>
  );
}
