import { useState } from 'react';
import Container from '../shared/Container';
import Eyebrow from '../shared/Eyebrow';
import Reveal from '../shared/Reveal';

const questions = [
  {
    q: 'Is this regulated financial advice?',
    a: 'No. Nestworth is educational guidance built on transparent arithmetic, not a registered investment adviser. Every recommendation shows its reasoning precisely so you can judge it yourself, or take it to someone who is registered.',
  },
  {
    q: 'Do I have to connect my bank account?',
    a: 'Never. You describe your situation in ranges — income band, how many people you support, roughly what leaves each month. There is no account linking, no statement upload and no read access to anything.',
  },
  {
    q: 'What happens to what I tell you?',
    a: 'It is used to compute your plan and nothing else. No selling, no sharing with lenders or fund houses, and no advertising built on your household. You can delete everything from settings and it is gone.',
  },
  {
    q: 'My income changes every month. Does that break it?',
    a: 'It is built for that. Give a typical range rather than a number, and the plan recalculates whenever you update it. Freelancers and variable-income earners get a wider buffer bucket automatically.',
  },
  {
    q: 'Why does the loan always come before investing?',
    a: 'Because clearing an 11% loan is a guaranteed 11% return, and no equity fund guarantees anything. When your loan rate drops below the long-run market return, the model flips the priority on its own.',
  },
];

export default function FAQ() {
  const [open, setOpen] = useState(0);

  return (
    <section id="questions" className="bg-paper">
      <Container className="py-24 lg:py-32">
        <div className="grid gap-14 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Reveal><Eyebrow>Straight answers</Eyebrow></Reveal>
            <Reveal delay={80}>
              <h2 className="mt-6 font-display text-[clamp(2.1rem,4vw,3.1rem)] leading-[1.06] tracking-[-0.02em]">
                The questions you should be asking.
              </h2>
            </Reveal>
            <Reveal delay={150}>
              <p className="mt-6 max-w-xs text-[15.5px] leading-relaxed text-ink2">
                A finance product that dodges these does not deserve your household.
              </p>
            </Reveal>
          </div>

          <div className="border-t border-line">
            {questions.map((item, index) => {
              const isOpen = open === index;
              return (
                <Reveal key={item.q} delay={index * 60}>
                  <div className="border-b border-line">
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? -1 : index)}
                      aria-expanded={isOpen}
                      className="group flex w-full items-center justify-between gap-6 py-6 text-left"
                    >
                      <span className={`font-display text-[21px] leading-snug tracking-[-0.01em] transition-colors duration-300 ${isOpen ? 'text-accent' : 'text-ink group-hover:text-accent'}`}>
                        {item.q}
                      </span>
                      <span className={`relative grid h-8 w-8 shrink-0 place-items-center rounded-full border transition-all duration-500 ease-smooth ${isOpen ? 'rotate-45 border-accent bg-accent text-white' : 'border-line text-muted group-hover:border-ink group-hover:text-ink'}`}>
                        <span className="absolute h-px w-3 bg-current" />
                        <span className="absolute h-3 w-px bg-current" />
                      </span>
                    </button>
                    <div
                      className="grid transition-[grid-template-rows] duration-500 ease-smooth"
                      style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
                    >
                      <div className="overflow-hidden">
                        <p className="max-w-xl pb-7 pr-10 text-[15px] leading-relaxed text-ink2">{item.a}</p>
                      </div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}
