// Just the essentials — when, where, how big. No format details.

const STATS = [
  { value: '11:00–16:00', label: 'Turniertag', sub: 'rund 5 Stunden Padel' },
  { value: 'Donauinsel', label: 'Wien', sub: 'open-air, mitten im Grünen' },
  { value: 'Drinks & Musik', label: 'Den ganzen Tag', sub: 'kühle Getränke & gute Stimmung' },
];

export default function BasicsSection() {
  return (
    <section id="rahmen" className="mx-auto max-w-content px-6 py-24 md:py-32">
      <div className="reveal mb-14 max-w-2xl">
        <p className="font-display text-sm font-semibold uppercase tracking-[0.3em] text-accent-ink">
          <span className="bg-accent px-2 py-0.5">Die Eckdaten</span>
        </p>
        <h2 className="mt-5 text-4xl font-bold uppercase leading-tight md:text-5xl">
          Ein Tag voller Padel
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-muted">
          Ein entspannter Spieltag auf der Donauinsel — vom ersten Aufschlag
          am Vormittag bis zum Finale am Nachmittag.
        </p>
      </div>

      <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-ink/10 bg-ink/10 sm:grid-cols-3">
        {STATS.map((stat) => (
          <div key={stat.label} className="reveal bg-white p-7 md:p-8">
            <dd className="font-display text-4xl font-bold leading-none text-court md:text-5xl">
              {stat.value}
            </dd>
            <dt className="mt-3 font-display text-sm font-semibold uppercase tracking-[0.18em]">
              {stat.label}
            </dt>
            <p className="mt-1 text-sm text-muted">{stat.sub}</p>
          </div>
        ))}
      </dl>
    </section>
  );
}
