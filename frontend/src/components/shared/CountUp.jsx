import { useEffect, useState } from 'react';

/*
  A number that counts up to its real value instead of just being there.

  This is the cheapest thing on the site that makes it feel alive. A net worth
  that lands at 4,20,000 says nothing; one that runs up to it makes the reader
  watch it. It runs once, when the number first appears.

  How the animation is done, since this is the interesting part:

  requestAnimationFrame asks the browser "call me back just before you draw the
  next frame". Doing it that way rather than with setInterval means the steps
  line up with the screen's refresh rate, so it stays smooth, and the browser
  stops calling us entirely if the tab is in the background. A setInterval would
  carry on firing into a tab nobody is looking at.

  Props:
    to       - the real number to land on
    format   - a function turning a number into the text on screen
    duration - milliseconds, optional
*/

// Long enough to be noticed, short enough that nobody is waiting on it.
const DEFAULT_DURATION = 900;

/*
  The easing curve. It takes "how far through the animation are we", from 0 to
  1, and returns "how far along the number should be", also 0 to 1.

  A straight line would count at a constant speed, which looks mechanical. This
  one starts fast and slows into the final value, which is the same feel as the
  ease-smooth used everywhere else in the theme.
*/
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
    /*
      Somebody who has asked their computer for less motion gets no count at
      all: the animation is given a length of zero, so the very first frame
      lands on the final number. The same question the reduced-motion block in
      global.css asks, but CSS cannot switch off an animation that is being
      driven from JavaScript, so it has to be asked again here.
    */
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

    /*
      Cancel the pending frame if this disappears mid-count, by navigating away
      or by the number changing. Without it the browser would still call back
      into a component that is no longer on screen.
    */
    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [to, totalTime]);

  return <>{format(shown)}</>;
}
