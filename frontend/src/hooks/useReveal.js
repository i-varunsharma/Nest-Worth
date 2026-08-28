import { useEffect, useRef, useState } from 'react';
import usePrefersReducedMotion from './usePrefersReducedMotion';

const noObserver = () => typeof IntersectionObserver === 'undefined';

/**
 * Reports whether an element has scrolled into view. One-way on purpose:
 * content that re-animates every time you scroll past gets annoying fast.
 *
 * Reduced motion and missing observer support both start as "already shown" —
 * nothing on the page may depend on an animation in order to be readable.
 */
export default function useReveal({ threshold = 0.15, rootMargin = '0px 0px -10% 0px' } = {}) {
  const ref = useRef(null);
  const reduced = usePrefersReducedMotion();
  const [seen, setSeen] = useState(() => noObserver());

  useEffect(() => {
    const node = ref.current;
    if (!node || seen || reduced || noObserver()) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setSeen(true); observer.disconnect(); }
      },
      { threshold, rootMargin },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin, seen, reduced]);

  return [ref, seen || reduced];
}
