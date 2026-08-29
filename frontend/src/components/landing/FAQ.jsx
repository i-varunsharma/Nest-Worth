import { useState } from 'react';
import Container from '../shared/Container';
import Eyebrow from '../shared/Eyebrow';
import Reveal from '../shared/Reveal';

/*
  FAQ
  ---
  An accordion: click a question, its answer slides open, and any other open
  answer slides shut.

  We remember which one is open by storing its position in the list.
  0 means the first question is open, and -1 means all of them are closed.
*/

const questions = [
  {
    question: 'Is this regulated financial advice?',
    answer:
      'No. Nestworth is educational guidance built on transparent arithmetic, not a registered '
      + 'investment adviser. Every recommendation shows its reasoning precisely so you can judge '
      + 'it yourself, or take it to someone who is registered.',
  },
  {
    question: 'Do I have to connect my bank account?',
    answer:
      'Never. You describe your situation in ranges: income band, how many people you support, '
      + 'roughly what leaves each month. There is no account linking, no statement upload and no '
      + 'read access to anything.',
  },
  {
    question: 'What happens to what I tell you?',
    answer:
      'It is used to compute your plan and nothing else. No selling, no sharing with lenders or '
      + 'fund houses, and no advertising built on your household. You can delete everything from '
      + 'settings and it is gone.',
  },
  {
    question: 'My income changes every month. Does that break it?',
    answer:
      'It is built for that. Give a typical range rather than a number, and the plan recalculates '
      + 'whenever you update it. Freelancers and variable-income earners get a wider buffer bucket '
      + 'automatically.',
  },
  {
    question: 'Why does the loan always come before investing?',
    answer:
      'Because clearing an 11% loan is a guaranteed 11% return, and no equity fund guarantees '
      + 'anything. When your loan rate drops below the long-run market return, the model flips the '
      + 'priority on its own.',
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(0);

  const handleQuestionClick = (index) => {
    // Clicking the question that is already open closes it again.
    if (openIndex === index) {
      setOpenIndex(-1);
    } else {
      setOpenIndex(index);
    }
  };

  return (
    <section id="questions" className="bg-paper">
      <Container className="py-24 lg:py-32">
        <div className="grid gap-14 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">

          {/* ---------- Left: the heading ---------- */}
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

          {/* ---------- Right: the questions ---------- */}
          <div className="border-t border-line">
            {questions.map((item, index) => {
              const isOpen = openIndex === index;

              // The question text turns green while its answer is open.
              let questionClasses = 'font-display text-[21px] leading-snug tracking-[-0.01em] transition-colors duration-300 ';
              if (isOpen === true) {
                questionClasses = questionClasses + 'text-accent';
              } else {
                questionClasses = questionClasses + 'text-ink group-hover:text-accent';
              }

              // The circle on the right holds a plus sign made from two small
              // bars. Rotating the whole circle 45 degrees turns it into a cross.
              let circleClasses = 'relative grid h-8 w-8 shrink-0 place-items-center rounded-full border transition-all duration-500 ease-smooth ';
              if (isOpen === true) {
                circleClasses = circleClasses + 'rotate-45 border-accent bg-accent text-white';
              } else {
                circleClasses = circleClasses + 'border-line text-muted group-hover:border-ink group-hover:text-ink';
              }

              // The answer slides open by animating its row height from 0fr to 1fr.
              // 0fr means "no height at all" and 1fr means "as tall as the content".
              let answerHeight = '0fr';
              if (isOpen === true) {
                answerHeight = '1fr';
              }

              return (
                <Reveal key={item.question} delay={index * 60}>
                  <div className="border-b border-line">

                    <button
                      type="button"
                      onClick={() => handleQuestionClick(index)}
                      aria-expanded={isOpen}
                      className="group flex w-full items-center justify-between gap-6 py-6 text-left"
                    >
                      <span className={questionClasses}>{item.question}</span>

                      <span className={circleClasses}>
                        <span className="absolute h-px w-3 bg-current" />
                        <span className="absolute h-3 w-px bg-current" />
                      </span>
                    </button>

                    <div
                      className="grid transition-[grid-template-rows] duration-500 ease-smooth"
                      style={{ gridTemplateRows: answerHeight }}
                    >
                      {/* This wrapper must clip its content, otherwise the answer
                          would still show through while the row height is zero. */}
                      <div className="overflow-hidden">
                        <p className="max-w-xl pb-7 pr-10 text-[15px] leading-relaxed text-ink2">
                          {item.answer}
                        </p>
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
