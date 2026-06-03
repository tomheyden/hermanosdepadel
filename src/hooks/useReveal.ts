import { useEffect, useRef } from 'react';

/**
 * Scroll-reveal via IntersectionObserver. Attach the returned ref to any
 * container; every descendant with the `.reveal` class fades/slides up once it
 * enters the viewport. Respects `prefers-reduced-motion` (the CSS makes
 * `.reveal` fully visible with no transition in that case, and we also skip the
 * observer entirely so nothing depends on it).
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const targets = Array.from(root.querySelectorAll<HTMLElement>('.reveal'));

    if (reduceMotion) {
      targets.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target); // reveal once, then stop watching
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return ref;
}
