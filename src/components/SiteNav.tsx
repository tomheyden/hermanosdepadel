import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface Props {
  /** When true the bar is transparent at the very top (over a dark hero) and
   *  turns solid on scroll. When false it's always solid. */
  overHero?: boolean;
}

const LINKS = [
  { to: '/', label: 'Start' },
  { to: '/turnier', label: 'Turnier' },
  { to: '/admin', label: 'Admin' },
];

/**
 * Shared top navigation so you can always move between the three areas:
 * Start (info), Turnier (public live view) and Admin (protected entry).
 */
export default function SiteNav({ overHero = false }: Props) {
  const [scrolled, setScrolled] = useState(!overHero);
  const { pathname } = useLocation();

  useEffect(() => {
    if (!overHero) return;
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [overHero]);

  const solid = scrolled;

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
        solid ? 'border-b border-paper/10 bg-court/95 backdrop-blur' : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-content items-center justify-between px-5 py-3 text-paper">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/logo.svg" alt="" aria-hidden="true" className="h-8 w-8" />
          <span className="font-display text-base font-bold uppercase tracking-wide">
            Hermanos de Padel
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {LINKS.map((l) => {
            const active = l.to === pathname;
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`rounded-full px-3.5 py-1.5 font-display text-sm font-semibold uppercase tracking-wide transition-colors ${
                  active
                    ? 'bg-accent text-accent-ink'
                    : 'text-paper/80 hover:bg-paper/10 hover:text-paper'
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
