import type { ReactNode } from 'react';
import { GroupsIcon, RepeatIcon, TargetIcon, LayersIcon } from '../icons';

// A concrete round-robin plan for a 4-team group — the clearest way to show
// "jeder gegen jeden": 3 rounds × 2 matches = 6 games, every pair once.
const ROUNDS: Array<{ label: string; games: Array<[string, string]> }> = [
  { label: 'Runde 1', games: [['1', '4'], ['2', '3']] },
  { label: 'Runde 2', games: [['1', '3'], ['4', '2']] },
  { label: 'Runde 3', games: [['1', '2'], ['3', '4']] },
];

function TeamChip({ n, tone = 'dark' }: { n: string; tone?: 'dark' | 'accent' }) {
  return (
    <span
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg font-display text-lg font-bold ${
        tone === 'accent' ? 'bg-accent text-accent-ink' : 'bg-court text-accent'
      }`}
    >
      T{n}
    </span>
  );
}

function RoundRobinPlan() {
  return (
    <div className="rounded-3xl border border-ink/10 bg-white p-6 md:p-8">
      <div className="flex items-center justify-between">
        <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-muted">
          Eine 4er-Gruppe
        </p>
        <div className="flex gap-1.5">
          {['1', '2', '3', '4'].map((n) => (
            <TeamChip key={n} n={n} />
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {ROUNDS.map((round) => (
          <div key={round.label} className="rounded-2xl bg-paper p-4">
            <p className="mb-3 font-display text-xs font-semibold uppercase tracking-[0.2em] text-court">
              {round.label}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {round.games.map(([a, b], i) => (
                <div
                  key={i}
                  className="flex items-center justify-center gap-2 rounded-xl border border-ink/10 bg-white px-2 py-2.5"
                >
                  <TeamChip n={a} />
                  <span className="font-display text-sm font-bold uppercase text-muted">vs</span>
                  <TeamChip n={b} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-5 text-center font-display text-lg font-bold uppercase tracking-wide text-court">
        3 Runden = 6 Spiele · jeder gegen jeden
      </p>
    </div>
  );
}

interface Point {
  badge: ReactNode;
  title: string;
  body: string;
}
const POINTS: Point[] = [
  {
    badge: <GroupsIcon className="h-6 w-6" />,
    title: 'Feste 2er-Teams',
    body: 'Ihr spielt das ganze Turnier in derselben Paarung — kein Partnerwechsel.',
  },
  {
    badge: <RepeatIcon className="h-6 w-6" />,
    title: 'Jeder gegen jeden',
    body: 'In der Gruppe trifft jedes Team einmal auf jedes andere. Vier Teams = sechs Spiele.',
  },
  {
    badge: <TargetIcon className="h-6 w-6" />,
    title: 'Golden Point',
    body: 'Kein Einstand: Steht es im entscheidenden Moment gleich, fällt mit einem einzigen Punkt die Entscheidung.',
  },
  {
    badge: <LayersIcon className="h-6 w-6" />,
    title: 'Verzahnte Gruppen',
    body: 'Die Gruppen sind über die Zeitslots verteilt — so wartet niemand lange auf sein nächstes Spiel.',
  },
];

export default function AmericanoSection() {
  return (
    <section id="americano" className="bg-paper">
      <div className="mx-auto max-w-content px-6 py-24 md:py-32">
        <div className="reveal mb-14 max-w-2xl">
          <p className="font-display text-sm font-semibold uppercase tracking-[0.3em] text-court">
            Gruppenphase
          </p>
          <h2 className="mt-5 text-4xl font-bold uppercase leading-tight md:text-5xl">
            Das Americano-Prinzip
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted">
            Maximales Spielen, minimales Warten: In der Gruppenphase spielt jedes
            Team gegen jedes andere seiner Gruppe — in drei Runden.
          </p>
        </div>

        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="reveal order-2 lg:order-1">
            <RoundRobinPlan />
          </div>

          <ul className="order-1 space-y-5 lg:order-2">
            {POINTS.map((p) => (
              <li key={p.title} className="reveal flex gap-5">
                <span
                  aria-hidden="true"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-court text-accent"
                >
                  {p.badge}
                </span>
                <div>
                  <h3 className="text-xl font-bold uppercase tracking-wide">{p.title}</h3>
                  <p className="mt-1 leading-relaxed text-muted">{p.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
