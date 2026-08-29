import useReveal from '../../hooks/useReveal';

/*
  Reveal
  ------
  Wrap anything in this component and it will fade upwards into place the first
  time the reader scrolls down to it.

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
  // useReveal gives us a ref to attach, and a true/false for "is it on screen".
  const [elementRef, isVisible] = useReveal();

  // Work out the classes before the JSX below, so the JSX stays easy to read.
  // "reveal" holds the starting position and the transition, and "is-in" is the
  // finished position. Both are written in src/styles/global.css.
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
