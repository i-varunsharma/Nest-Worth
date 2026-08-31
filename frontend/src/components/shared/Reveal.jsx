import useReveal from '../../hooks/useReveal';

/*
  Wrap anything in this and it fades upwards into place the first time the
  reader scrolls down to it.

    <Reveal>
      <h2>This heading fades in</h2>
    </Reveal>

  The optional "delay" prop staggers several items so they arrive one after
  another instead of all at once:

    <Reveal delay={0}>...</Reveal>
    <Reveal delay={100}>...</Reveal>
    <Reveal delay={200}>...</Reveal>
*/
export default function Reveal({ children, delay, className }) {
  // A ref to attach, and a true/false for "is it on screen".
  const [elementRef, isVisible] = useReveal();

  // Worked out before the JSX so the markup stays readable. "reveal" is the
  // starting position and transition, "is-in" the finished position. Both are
  // in src/styles/global.css.
  let classes = 'reveal';
  if (isVisible === true) {
    classes = 'reveal is-in';
  }
  if (className) {
    classes = classes + ' ' + className;
  }

  // If no delay was given, start immediately.
  let delayInMilliseconds = 0;
  if (delay) {
    delayInMilliseconds = delay;
  }

  return (
    <div
      ref={elementRef}
      className={classes}
      style={{ transitionDelay: delayInMilliseconds + 'ms' }}
    >
      {children}
    </div>
  );
}
