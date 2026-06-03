import { ArrowDownIcon, PinIcon } from '../icons';

/**
 * Photographic, full-bleed dark hero: a padel ball on a deep racing-green
 * gradient. The image is already on-brand dark green, so the overlay is light
 * in the middle (ball stays visible) and stronger at top/bottom to keep the
 * location pill, claim and CTA crisp. The logo rolls in like a ball.
 */
export default function Hero() {
  return (
    <header className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-6 py-24 text-center text-paper">
      {/* background photo + overlays */}
      <img
        src="/ball-green.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(0,44,30,0.78) 0%, rgba(0,44,30,0.30) 38%, rgba(0,44,30,0.32) 62%, rgba(0,44,30,0.95) 100%)',
        }}
      />

      {/* content */}
      <div className="relative flex flex-col items-center">
        <img
          src="/logo.svg"
          alt="Hermanos de Padel Logo"
          className="mb-8 h-28 w-28 drop-shadow-lg motion-safe:animate-roll-in md:h-36 md:w-36"
        />

        <p className="reveal mb-6 inline-flex items-center gap-2 rounded-full border border-paper/25 bg-court/30 px-4 py-1.5 font-display text-xs font-semibold uppercase tracking-[0.3em] text-accent backdrop-blur-sm md:text-sm">
          <PinIcon className="h-4 w-4" />
          Wien · auf der Donauinsel
        </p>

        <h1 className="reveal max-w-4xl font-display text-[3.25rem] font-bold uppercase leading-[1.02] tracking-[0.02em] sm:text-7xl md:text-8xl">
          <span className="block">Hermanos</span>
          <span className="block text-accent">de Padel</span>
          <span className="mt-3 inline-block bg-accent px-4 pb-2 pt-1 text-accent-ink">
            Turnier
          </span>
        </h1>

        <p className="reveal mt-9 max-w-xl text-lg leading-relaxed text-paper/85 md:text-xl">
          Ein Tag auf der Donauinsel, zwei Plätze, ein Sieger — vom ersten
          Aufschlag um 11:10 Uhr bis zum letzten Golden Point im Finale.
        </p>

        <a href="#rahmen" className="reveal mt-10 btn-accent">
          Zum Ablauf
          <ArrowDownIcon className="h-5 w-5" />
        </a>
      </div>

      {/* scroll cue */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-paper/70">
        <span className="flex flex-col items-center gap-2">
          <span className="font-display text-xs uppercase tracking-[0.3em]">Scroll</span>
          <ArrowDownIcon className="h-5 w-5 motion-safe:animate-bounce" />
        </span>
      </div>
    </header>
  );
}
