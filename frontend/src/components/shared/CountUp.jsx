import { useEffect, useState } from 'react';

/*
  A number that counts up to its value when it first appears.

  requestAnimationFrame calls back just before each frame is drawn, so the count
  stays in step with the screen and pauses in a background tab.

  Props:
    to        the number to land on
    format    turns a number into the text shown
    duration  milliseconds, optional
*/

// Long enough to be noticed, short enough that nobody is waiting on it.
const DEFAULT_DURATION = 900;

// Starts fast and slows into the final value, like ease-smooth in the theme.
function easeOut(progress) {
  const remaining = 1 - progress;
  return 1 - remaining * remaining * remaining;
}

export default function CountUp({ to, format, duration }) {
  const [shown, setShown] = useState(0);

  let totalTime = DEFAULT_DURATION;
  if (duration) {
    totalTime = duration;
  }

  useEffect(() => {
    // People who ask their system for reduced motion get the final number immediately.
    // CSS cannot stop an animation driven from JavaScript, so it is checked here.
    const prefersLessMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let runFor = totalTime;
    if (prefersLessMotion === true) {
      runFor = 0;
    }

    // Where the animation started, in milliseconds. Filled in on the first frame.
    let startedAt = null;

    // The id of the frame we asked for, so it can be cancelled on the way out.
    let frameId = null;

    const step = (now) => {
      if (startedAt === null) {
        startedAt = now;
      }

      const elapsed = now - startedAt;

      // Done already when there is no time to run for. Working it out as a
      // division would be elapsed divided by zero, which is not a number.
      let progress = 1;

      if (runFor > 0) {
        progress = elapsed / runFor;

        if (progress > 1) {
          progress = 1;
        }
      }

      setShown(to * easeOut(progress));

      if (progress < 1) {
        frameId = window.requestAnimationFrame(step);
      }
    };

    frameId = window.requestAnimationFrame(step);

    // Cancels the pending frame if the component goes away or the number changes.
    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [to, totalTime]);

  return <>{format(shown)}</>;
}
