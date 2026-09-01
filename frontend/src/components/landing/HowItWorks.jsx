import Container from '../shared/Container';
import Eyebrow from '../shared/Eyebrow';
import Reveal from '../shared/Reveal';
import useReveal from '../../hooks/useReveal';

/*
  Three numbered steps down the right hand side, with a thin line running
  through the numbers. Each number turns green as you scroll down to it.
*/

const steps = [
  {
    aside: 'Ranges, not receipts',
    title: 'Describe your household',
    text: 'Income, and who it carries. Rough numbers are fine.',
  },
  {
    aside: 'No black box',
    title: 'Get a plan, and the reason for it',
    text: 'A spend, save and invest split, with the sentence that produced it.',
  },
  {
    aside: 'Built to be revisited',
    title: 'Watch it compound',
    text: 'Record each month. Ask the coach what to do next.',
  },
];

/*
  One step. This is its own small component purely so that each step can have its
  own useReveal, letting its number light up independently of the other two.
*/
function Step({ step, number, isLast }) {
  const [stepRef, isVisible] = useReveal();

  // The circle is empty until the step is on screen, then it fills with green.
  let circleClasses =
    'absolute -left-12 top-1 grid h-8 w-8 place-items-center rounded-full border '
    + 'text-[12px] font-semibold transition-all duration-500 ease-smooth ';

  if (isVisible === true) {
    circleClasses = circleClasses + 'border-accent bg-accent text-white';
  } else {
    circleClasses = circleClasses + 'border-line bg-paper text-muted';
  }

  // The last step needs no gap underneath it.
  let wrapperClasses = 'reveal relative pb-16';
  if (isLast === true) {
    wrapperClasses = 'reveal relative pb-0';
  }
  if (isVisible === true) {
    wrapperClasses = wrapperClasses + ' is-in';
  }

  return (
    <div ref={stepRef} className={wrapperClasses}>
      <span className={circleClasses}>{number}</span>

      <p className="text-2xs font-semibold uppercase tracking-widest2 text-brass">{step.aside}</p>
      <h3 className="mt-3 font-display text-[26px] leading-tight tracking-[-0.01em]">{step.title}</h3>
      <p className="mt-3 max-w-md text-[15.5px] leading-relaxed text-ink2">{step.text}</p>
    </div>
  );
}

export default function HowItWorks() {
  return (
    <section id="how" className="bg-paper">
      <Container className="py-24 lg:py-32">
        <div className="grid gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">

          {/* ---------- Left: the heading, which stays put while you scroll ---------- */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Reveal><Eyebrow>How it works</Eyebrow></Reveal>

            <Reveal delay={80}>
              <h2 className="mt-6 font-display text-[clamp(2.1rem,4vw,3.1rem)] leading-[1.06] tracking-[-0.02em]">
                Three steps.
              </h2>
            </Reveal>

            <Reveal delay={150}>
              <p className="mt-6 max-w-xs text-[16px] leading-relaxed text-ink2">
                About three minutes, start to finish.
              </p>
            </Reveal>
          </div>

          {/* ---------- Right: the steps ---------- */}
          {/* The left padding makes room for the numbered circles, which are
              positioned just outside this column. */}
          <div className="relative pl-12">

            {/* The thin line the circles sit on. */}
            <div className="absolute left-[15px] top-2 h-[calc(100%-2rem)] w-px bg-line" aria-hidden="true" />

            {steps.map((step, index) => {
              return (
                <Step
                  key={step.title}
                  step={step}
                  number={index + 1}
                  isLast={index === steps.length - 1}
                />
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}
