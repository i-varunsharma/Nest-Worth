import { useEffect, useRef, useState } from 'react';
import usePrefersReducedMotion from './usePrefersReducedMotion';

const easeOut = (t) => 1 - Math.pow(1 - t, 3);

/**
 * Animates a number toward its target so figures land rather than snap.
 * Retargeting mid-flight starts from wherever the value currently is, which is
 * what keeps the planner from stuttering while the income slider is dragged.
 */
export default function useCountUp(target, { duration = 900, active = true } = {}) {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(0);
  const current = useRef(0);
  const frame = useRef(0);

  useEffect(() => {
    if (!active || reduced) return undefined;

    const origin = current.current;
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const next = origin + (target - origin) * easeOut(progress);
      current.current = next;
      setValue(next);
      if (progress < 1) frame.current = requestAnimationFrame(step);
    };

    frame.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame.current);
  }, [target, duration, active, reduced]);

  return active && !reduced ? value : target;
}
