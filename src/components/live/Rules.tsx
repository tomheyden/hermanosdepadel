import type { Scenario } from '../../types';

/**
 * Read-only rules tab, split into group phase (fixed format) and KO phase
 * (taken from the scenario's koSummary for now — still provisional).
 * `variant` adapts to the light admin board or the dark public beamer.
 */
export default function Rules({
  scenario,
  variant = 'light',
}: {
  scenario: Scenario;
  variant?: 'light' | 'dark';
}) {
  const dark = variant === 'dark';
  const hasBonus = scenario.koSchedule.some((m) => m.stage === 'BONUS');
  const c = {
    heading: dark ? 'text-accent' : 'text-court',
    card: dark ? 'bg-court-soft' : 'bg-white border border-ink/10',
    chipBg: dark ? 'bg-black/20' : 'bg-paper',
    chipNum: dark ? 'text-accent' : 'text-court',
    chipLabel: dark ? 'text-paper/60' : 'text-muted',
    body: dark ? 'text-paper/85' : 'text-ink',
    muted: dark ? 'text-paper/60' : 'text-muted',
    bullet: dark ? 'bg-accent' : 'bg-court',
    rule: dark ? 'border-paper/10' : 'border-ink/10',
  };

  return (
    <section className="space-y-8">
      <h2 className={`font-display text-3xl font-bold uppercase tracking-wide ${dark ? 'text-accent' : 'text-ink'}`}>
        Spielregeln
      </h2>

      {/* ── Gruppenphase ──────────────────────────────────────────────────── */}
      <div className={`rounded-3xl p-6 md:p-8 ${c.card}`}>
        <h3 className={`font-display text-2xl font-bold uppercase tracking-wide ${c.heading}`}>
          Gruppenphase
        </h3>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <Chip num="12" unit="Min" label="max. pro Spiel" c={c} />
          <Chip num="21" unit="Pkt" label="insgesamt" c={c} />
          <Chip num="GP" label="bei Gleichstand" c={c} />
        </div>

        <ul className="mt-6 space-y-3">
          <Rule c={c}>
            Jedes Spiel läuft <strong>maximal 12 Minuten</strong> oder bis <strong>insgesamt 21
            Punkte</strong> gespielt sind — je nachdem, was zuerst eintritt (z.&nbsp;B. 15:6, 12:9).
          </Rule>
          <Rule c={c}>
            Ist die <strong>Zeit abgelaufen</strong>, zählt der aktuelle Spielstand als Ergebnis.
          </Rule>
          <Rule c={c}>
            Steht es bei Zeitablauf <strong>unentschieden</strong>, entscheidet ein{' '}
            <strong>Golden Point</strong>.
          </Rule>
          <Rule c={c}>
            <strong>Tabellenwertung:</strong> 1.&nbsp;Anzahl Siege · 2.&nbsp;erzielte Punkte ·
            3.&nbsp;Punktdifferenz (bei gleicher Punktzahl). Entscheidend z.&nbsp;B. für den besten
            Gruppendritten.
          </Rule>
        </ul>
      </div>

      {/* ── KO-Phase ──────────────────────────────────────────────────────── */}
      <div className={`rounded-3xl p-6 md:p-8 ${c.card}`}>
        <div className="flex flex-wrap items-center gap-3">
          <h3 className={`font-display text-2xl font-bold uppercase tracking-wide ${c.heading}`}>
            KO-Phase
          </h3>
          <span className={`rounded-full px-2.5 py-0.5 font-display text-xs font-bold uppercase tracking-wide ${c.chipBg} ${c.muted}`}>
            vorläufig
          </span>
        </div>

        <ul className="mt-5 space-y-3">
          <Rule c={c}>{scenario.koSummary}</Rule>
          <Rule c={c}>
            <strong>Setzung:</strong> alle Qualifizierten werden nach (1)&nbsp;Siegen,
            (2)&nbsp;erzielten Punkten gereiht — dann spielt <strong>der Beste gegen den
            Schlechtesten</strong>, der Zweitbeste gegen den Zweitschlechtesten usw.
          </Rule>
          <Rule c={c}>
            Bei Gleichstand entscheidet auch hier der <strong>Golden Point</strong>.
          </Rule>
          <Rule c={c}>
            <strong>Qualifikation:</strong> {qualificationText(scenario)}
          </Rule>
        </ul>

        <p className={`mt-5 text-sm ${c.muted}`}>
          Das genaue KO-Format wird noch finalisiert.
        </p>
      </div>

      {/* ── Bonusrunde ────────────────────────────────────────────────────── */}
      {hasBonus && (
        <div className={`rounded-3xl p-6 md:p-8 ${c.card}`}>
          <h3 className={`font-display text-2xl font-bold uppercase tracking-wide ${c.heading}`}>
            Finale der Herzen
          </h3>
          <ul className="mt-5 space-y-3">
            <Rule c={c}>
              Die <strong>4 Teams</strong>, die in der Gruppenphase ausscheiden, spielen zwischen
              Halbfinale und Finale noch <strong>2 Spiele à 12&nbsp;Minuten</strong> (gleiche Regeln
              wie die Gruppenphase) — so können sich die Finalisten ausruhen.
            </Rule>
            <Rule c={c}>
              Gereiht nach (1)&nbsp;Siegen, (2)&nbsp;Punkten spielt der <strong>Beste gegen den
              Schlechtesten</strong> und der Zweitbeste gegen den Drittbesten.
            </Rule>
            <Rule c={c}>
              Der am Ende Schlechteste von allen erhält den Pokal als{' '}
              <strong>„Worst Team of the Tournament"</strong>. 🏆
            </Rule>
          </ul>
        </div>
      )}
    </section>
  );
}

function qualificationText(scenario: Scenario): string {
  const q = scenario.qualification;
  let text = q.topPerGroup === 1 ? 'der Gruppensieger' : `die Top ${q.topPerGroup} jeder Gruppe`;
  if (q.bestRunnersUp && q.bestRunnersUpRank) {
    const rank = q.bestRunnersUpRank === 2 ? 'Gruppenzweiten' : 'Gruppendritten';
    text +=
      q.bestRunnersUp === 1
        ? ` plus der beste ${rank}`
        : ` plus die ${q.bestRunnersUp} besten ${rank}`;
  }
  return `${text} ziehen in die KO-Phase ein (${q.qualifierCount} Teams).`;
}

function Chip({
  num,
  unit,
  label,
  c,
}: {
  num: string;
  unit?: string;
  label: string;
  c: Record<string, string>;
}) {
  return (
    <div className={`rounded-2xl px-3 py-4 text-center ${c.chipBg}`}>
      <p className={`font-display text-3xl font-bold tabular-nums ${c.chipNum}`}>
        {num}
        {unit && <span className="ml-1 text-base">{unit}</span>}
      </p>
      <p className={`mt-1 font-display text-[0.65rem] uppercase tracking-wide ${c.chipLabel}`}>
        {label}
      </p>
    </div>
  );
}

function Rule({ c, children }: { c: Record<string, string>; children: React.ReactNode }) {
  return (
    <li className={`flex gap-3 border-b pb-3 last:border-0 last:pb-0 ${c.rule}`}>
      <span className={`mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full ${c.bullet}`} />
      <span className={`leading-relaxed ${c.body}`}>{children}</span>
    </li>
  );
}
