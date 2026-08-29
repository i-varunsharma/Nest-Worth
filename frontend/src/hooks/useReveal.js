import { useEffect, useRef, useState } from 'react';

/*
  Has the person asked their computer to reduce animations?
  Some people turn this on because motion makes them feel unwell, so we respect
  it by showing everything straight away instead of fading it in.
*/
function prefersNoMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/*
  useReveal
  ---------
  A small custom hook that answers one question:
  "has this element been scrolled into view yet?"

  How to use it:

    const [boxRef, isVisible] = useReveal();
    return <div ref={boxRef}>{isVisible ? 'you can see me' : 'not yet'}</div>;

  You attach the ref to an element, and isVisible turns true the first time that
  element scrolls onto the screen. We use it to fade sections in as you scroll.

  It only ever flips from false to true once. Content that re-animates every time
  you scroll past it gets annoying very quickly.
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

    // IntersectionObserver is a browser tool that tells us when an element
    // enters the visible part of the page. It is much cheaper than checking
    // the scroll position on every single scroll event.
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];

      if (entry.isIntersecting === true) {
        setIsVisible(true);

        // We only care about the first time, so stop watching now.
        observer.disconnect();
      }
    });

    observer.observe(element);

    // React runs this clean-up function when the component is removed,
    // which stops the observer from leaking memory.
    return () => {
      observer.disconnect();
    };
  }, [isVisible]);

  return [elementRef, isVisible];
}
