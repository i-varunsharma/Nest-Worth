import { useEffect, useRef, useState } from 'react';

/*
  Has the person asked their computer to reduce animations? Some turn this on
  because motion makes them feel unwell, so we show everything straight away
  instead of fading it in.
*/
function prefersNoMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/*
  A hook that answers one question: has this element been scrolled into view?

    const [boxRef, isVisible] = useReveal();

  Attach the ref to an element and isVisible turns true the first time it
  scrolls onto the screen. Used to fade sections in.

  It flips from false to true once and stays there. Content that re-animates
  every time you scroll past it gets annoying.
*/
export default function useReveal() {
  // A ref is just a box that holds a value. React puts the real DOM element
  // inside elementRef.current once the element has been drawn on the screen.
  const elementRef = useRef(null);

  // Starts false for most people, and true for anyone who has switched
  // animations off, so they simply see the finished page.
  const [isVisible, setIsVisible] = useState(prefersNoMotion());

  useEffect(() => {
    const element = elementRef.current;

    // Nothing to do if the element is not on the page, or if we are already
    // showing it because animations are switched off.
    if (element === null || isVisible === true) {
      return;
    }

    // IntersectionObserver tells us when an element enters the visible part of
    // the page. Much cheaper than checking scroll position on every event.
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];

      if (entry.isIntersecting === true) {
        setIsVisible(true);

        // We only care about the first time, so stop watching now.
        observer.disconnect();
      }
    });

    observer.observe(element);

    // React runs this when the component is removed, so the observer does not
    // leak memory.
    return () => {
      observer.disconnect();
    };
  }, [isVisible]);

  return [elementRef, isVisible];
}
