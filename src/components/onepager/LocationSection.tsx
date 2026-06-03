import { PinIcon } from '../icons';

/**
 * Photographic band that breaks up the cream sections and gives the venue its
 * own moment. Full-bleed aerial court photo under a deep-green gradient.
 */
export default function LocationSection() {
  return (
    <section id="location" className="relative overflow-hidden">
      <img
        src="/court-aerial.jpg"
        alt="Padelplatz aus der Vogelperspektive, umgeben von Bäumen"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(110deg, rgba(0,44,30,0.94) 0%, rgba(0,44,30,0.82) 45%, rgba(0,44,30,0.35) 100%)',
        }}
      />
      <div className="relative mx-auto max-w-content px-6 py-28 text-paper md:py-36">
        <div className="reveal max-w-xl">
          <p className="inline-flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-[0.3em] text-accent">
            <PinIcon className="h-4 w-4" /> Der Austragungsort
          </p>
          <h2 className="mt-5 text-4xl font-bold uppercase leading-tight md:text-6xl">
            Mitten in Wien,
            <span className="block text-accent">auf der Donauinsel</span>
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-paper/85">
            Gespielt wird open-air auf der Donauinsel — Wiens grünem Sport-Hotspot
            zwischen Neuer und Alter Donau. Wasser, Bäume, Sonne und der
            unverkennbare Sound vom Court.
          </p>
        </div>
      </div>
    </section>
  );
}
