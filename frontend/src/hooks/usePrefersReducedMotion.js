import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

const initial = () => typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia(QUERY).matches;

/** Tracks the OS motion preference, including changes made while the page is open. */
export default function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(initial);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const media = window.matchMedia(QUERY);
    const onChange = (event) => setReduced(event.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
