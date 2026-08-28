import { useEffect, useRef, useState } from 'react';
import Container from '../shared/Container';
import Eyebrow from '../shared/Eyebrow';
import Reveal from '../shared/Reveal';

const steps = [
  {
    title: 'Describe your household',
    body: 'Income, and who it carries. Dependents, a sibling in college, family debt. Ranges are fine — nobody remembers their exact grocery spend, and the model does not need it.',
    aside: 'Ranges, not receipts',
  },
  {
    title: 'Get a plan with its reasoning',
    body: 'A spend, save and invest split built from what is genuinely left after your household. Every number arrives with the sentence that produced it, and you can ask why on any of them.',
    aside: 'No black box',
  },
  {
    title: 'Watch it compound',
    body: 'Progress against the plan, a nudge when a priority changes, and a projection of what today’s decision is worth in fifteen years. Built to keep you consistent, not impressed.',
    aside: 'Motivation by design',
  },
];

export default function HowItWorks() {
  const sectionRef = useRef(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const node = sectionRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const span = rect.height - window.innerHeight * 0.5;
      const scrolled = window.innerHeight * 0.5 - rect.top;
      setProgress(Math.min(Math.max(scrolled / Math.max(span, 1), 0), 1));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <section id="how" className="bg-paper">
      <Container className="py-24 lg:py-32">
        <div className="grid gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Reveal><Eyebrow>How it works</Eyebrow></Reveal>
            <Reveal delay={80}>
              <h2 className="mt-6 font-display text-[clamp(2.1rem,4vw,3.1rem)] leading-[1.06] tracking-[-0.02em]">
                Three steps to an answer you can argue with.
              </h2>
            </Reveal>
            <Reveal delay={150}>
              <p className="mt-6 max-w-sm text-[16px] leading-relaxed text-ink2">
                Not a rule of thumb borrowed from another country. A recommendation shaped by
                the life you actually fund.
              </p>
            </Reveal>
          </div>

          <div ref={sectionRef} className="relative pl-12">
            <div className="absolute left-[15px] top-2 h-[calc(100%-2rem)] w-px bg-line" aria-hidden="true" />
            <div
              className="absolute left-[15px] top-2 w-px origin-top bg-accent transition-[height] duration-200 ease-out"
              style={{ height: `calc(${progress * 100}% - ${progress * 2}rem)` }}
              aria-hidden="true"
            />

            {steps.map((step, index) => {
              const reached = progress >= index / steps.length;
              return (
                <Reveal key={step.title} delay={index * 90} className="relative pb-16 last:pb-0">
                  <span
                    className={`absolute -left-12 top-1 grid h-8 w-8 place-items-center rounded-full border text-[12px] font-semibold transition-all duration-500 ease-smooth ${
                      reached ? 'border-accent bg-accent text-white' : 'border-line bg-paper text-muted'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <p className="text-2xs font-semibold uppercase tracking-widest2 text-brass">{step.aside}</p>
                  <h3 className="mt-3 font-display text-[26px] leading-tight tracking-[-0.01em]">{step.title}</h3>
                  <p className="mt-3.5 max-w-lg text-[15.5px] leading-relaxed text-ink2">{step.body}</p>
                </Reveal>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}
