const STEPS = [
  {
    no: '01',
    title: 'Gruppenphase',
    body: 'Im Americano-Modus spielt jedes feste 2er-Team Round-Robin gegen die anderen Teams seiner Gruppe. Jeder Punkt zählt — gespielt wird mit Golden Point.',
  },
  {
    no: '02',
    title: 'Qualifikation',
    body: 'Aus den Gruppentabellen qualifizieren sich — je nach Szenario — die Gruppensieger, die besten Zweiten oder die Top 2 jeder Gruppe für die KO-Phase.',
  },
  {
    no: '03',
    title: 'KO-Phase',
    body: 'Im K.-o.-Baum geht es um alles: Viertel- und Halbfinale entscheiden, wer ums Gold spielt. Kurzsatz oder Best-of-3 — je nach Format.',
  },
  {
    no: '04',
    title: 'Finale & Platz 3',
    body: 'Das Finale auf Platz 1, parallel das Spiel um Platz 3 auf Platz 2. Bei 1:1 nach Sätzen fällt die Entscheidung im Match-Tie-Break bis 7.',
  },
];

export default function FormatSection() {
  return (
    <section id="ablauf" className="bg-court text-paper">
      <div className="mx-auto max-w-content px-6 py-24 md:py-32">
        <div className="reveal mb-16 max-w-2xl">
          <p className="font-display text-sm font-semibold uppercase tracking-[0.3em] text-accent">
            Ablauf &amp; Modus
          </p>
          <h2 className="mt-5 text-4xl font-bold uppercase leading-tight md:text-5xl">
            So läuft der Turniertag
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-paper/70">
            Von der Gruppenphase bis zum letzten Ballwechsel — vier Etappen, ein
            Ziel.
          </p>
        </div>

        <ol className="grid gap-px overflow-hidden rounded-2xl bg-paper/10 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <li
              key={step.no}
              className="reveal flex flex-col bg-court p-8 transition-colors duration-200 hover:bg-court-soft"
            >
              <span className="font-display text-5xl font-bold text-accent">{step.no}</span>
              <h3 className="mt-4 text-2xl font-bold">{step.title}</h3>
              <p className="mt-3 leading-relaxed text-paper/70">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
