import { Link } from 'react-router-dom';
import { useTournament } from '../hooks/useTournament';
import { computeAllStandings } from '../lib/standings';
import { computeQualification } from '../lib/qualification';
import { resolveBracket, computeFinalStandings } from '../lib/bracket';
import { evaluateMatch } from '../lib/match';
import { teamName } from '../lib/display';
import type { KoStage, MatchResult, Scenario, SlotId, SlotRef, Team } from '../types';
import { TrophyIcon } from '../components/icons';

/**
 * Read-only "beamer" view (no password). Mirrors the live standings, KO bracket
 * and final result, and updates automatically: useTournament subscribes to the
 * storage abstraction, so edits made on /live in another tab push here live.
 */
export default function LiveView() {
  const { state, loaded, scenario } = useTournament();

  if (!loaded) {
    return <Centered>Lädt…</Centered>;
  }
  if (!state || !state.setupComplete || !scenario) {
    return (
      <Centered>
        <img src="/logo.svg" alt="" aria-hidden="true" className="mb-6 h-20 w-20" />
        <h1 className="font-display text-4xl font-bold uppercase">Hermanos de Padel</h1>
        <p className="mt-3 text-paper/70">Das Turnier startet in Kürze.</p>
        <div className="mt-8 flex items-center gap-4 text-sm">
          <Link to="/" className="text-paper/70 hover:text-paper">
            Zur Startseite
          </Link>
          <span className="text-paper/30">·</span>
          <Link to="/admin" className="text-accent hover:underline">
            Zum Admin-Bereich
          </Link>
        </div>
      </Centered>
    );
  }

  return <Beamer state={{ teams: state.teams, results: state.results }} scenario={scenario} />;
}

function Beamer({
  state,
  scenario,
}: {
  state: { teams: Record<SlotId, Team>; results: Record<string, MatchResult> };
  scenario: Scenario;
}) {
  const { teams, results } = state;
  const standings = computeAllStandings(scenario, teams, results);
  const qualification = computeQualification(scenario, teams, results);
  const qualified = new Set(qualification.seeds);
  const bracket = resolveBracket(scenario, qualification.seeds, results);
  const places = computeFinalStandings(bracket);

  return (
    <div className="min-h-[100svh] bg-court text-paper">
      <header className="border-b border-paper/15">
        <div className="mx-auto flex max-w-[100rem] items-center justify-between gap-4 px-8 py-5">
          <div className="flex items-center gap-4">
            <img src="/logo.svg" alt="" aria-hidden="true" className="h-12 w-12" />
            <div>
              <p className="font-display text-2xl font-bold uppercase tracking-wide">
                Hermanos de Padel · Live
              </p>
              <p className="text-sm text-paper/70">{scenario.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Link
              to="/"
              className="hidden rounded-full px-3.5 py-1.5 font-display text-sm font-semibold uppercase tracking-wide text-paper/70 transition-colors hover:bg-paper/10 hover:text-paper sm:inline-block"
            >
              Start
            </Link>
            <Link
              to="/admin"
              className="rounded-full border border-paper/25 px-3.5 py-1.5 font-display text-sm font-semibold uppercase tracking-wide text-paper/85 transition-colors hover:border-accent hover:text-accent"
            >
              Admin
            </Link>
            <span className="rounded-full bg-accent px-4 py-1.5 font-display text-sm font-bold uppercase tracking-wide text-accent-ink">
              ● Live
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[100rem] space-y-12 px-8 py-10">
        {places && <Podium places={places} teams={teams} />}

        {/* Group tables */}
        <section>
          <h2 className="mb-6 font-display text-3xl font-bold uppercase tracking-wide text-accent">
            Gruppen
          </h2>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {scenario.groups.map((group) => (
              <div key={group.id} className="overflow-hidden rounded-2xl bg-court-soft">
                <div className="bg-black/20 px-5 py-3 font-display text-xl font-bold uppercase tracking-wide">
                  {group.label}
                </div>
                <table className="w-full">
                  <tbody>
                    {standings[group.id].map((s) => {
                      const isQ = qualified.has(s.teamId);
                      return (
                        <tr key={s.teamId} className="border-b border-paper/10 last:border-0">
                          <td className="w-10 py-3 pl-5">
                            <span
                              className={`inline-flex h-7 w-7 items-center justify-center rounded-full font-display text-sm font-bold ${
                                isQ ? 'bg-accent text-accent-ink' : 'bg-paper/10 text-paper/70'
                              }`}
                            >
                              {s.rank}
                            </span>
                          </td>
                          <td className="py-3 pl-2 pr-2 text-lg font-semibold">
                            {teamName(teams, s.teamId)}
                          </td>
                          <td className="py-3 pr-2 text-center text-sm text-paper/60">
                            {s.won} S
                          </td>
                          <td className="py-3 pr-5 text-right font-display text-xl font-bold tabular-nums text-accent">
                            {s.pointsFor}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </section>

        {/* KO bracket */}
        <section>
          <h2 className="mb-6 font-display text-3xl font-bold uppercase tracking-wide text-accent">
            KO-Baum
          </h2>
          <BeamerBracket scenario={scenario} teams={teams} results={results} bracket={bracket} />
        </section>
      </div>
    </div>
  );
}

const STAGE_TITLES: Record<KoStage, string> = {
  QF: 'Viertelfinale',
  SF: 'Halbfinale',
  F: 'Finale',
  P3: 'Platz 3',
};
const COLUMN_ORDER: KoStage[][] = [['QF'], ['SF'], ['F', 'P3']];

function BeamerBracket({
  scenario,
  teams,
  results,
  bracket,
}: {
  scenario: Scenario;
  teams: Record<SlotId, Team>;
  results: Record<string, MatchResult>;
  bracket: ReturnType<typeof resolveBracket>;
}) {
  const describe = (ref: SlotRef): string => {
    if (ref.type === 'seed') return `Qualifikant ${ref.seed}`;
    const src = scenario.koSchedule.find((m) => m.id === ref.matchId);
    return `${ref.type === 'winner' ? 'Sieger' : 'Verlierer'} ${src?.label ?? ''}`.trim();
  };

  const columns = COLUMN_ORDER.map((stages) =>
    bracket.filter((m) => stages.includes(m.def.stage)),
  ).filter((col) => col.length > 0);

  return (
    <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
      {columns.map((col, ci) => (
        <div key={ci} className="space-y-5">
          {col.map((m) => {
            const home = m.homeTeam ? teamName(teams, m.homeTeam) : describe(m.def.home);
            const away = m.awayTeam ? teamName(teams, m.awayTeam) : describe(m.def.away);
            const out = evaluateMatch(results[m.def.id], m.def.format);
            const score = (side: 'home' | 'away') =>
              results[m.def.id]?.sets.map((s) => s[side]).join(' ') ?? '';
            return (
              <div key={m.def.id} className="overflow-hidden rounded-2xl bg-court-soft">
                <div className="flex items-center justify-between bg-black/20 px-4 py-2">
                  <span className="font-display text-sm font-bold uppercase tracking-wide">
                    {m.def.label || STAGE_TITLES[m.def.stage]}
                  </span>
                  <span className="font-display text-xs text-paper/60">{m.def.time}</span>
                </div>
                <BracketSide name={home} score={score('home')} won={out.winner === 'home'} />
                <div className="h-px bg-paper/10" />
                <BracketSide name={away} score={score('away')} won={out.winner === 'away'} />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function BracketSide({ name, score, won }: { name: string; score: string; won: boolean }) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 ${won ? 'bg-accent/15' : ''}`}>
      <span className={`text-lg ${won ? 'font-bold text-paper' : 'text-paper/75'}`}>{name}</span>
      <span className="font-display text-xl font-bold tabular-nums text-accent">{score}</span>
    </div>
  );
}

function Podium({
  places,
  teams,
}: {
  places: NonNullable<ReturnType<typeof computeFinalStandings>>;
  teams: Record<SlotId, Team>;
}) {
  const style: Record<number, string> = {
    1: 'bg-accent text-accent-ink',
    2: 'bg-paper/15',
    3: 'bg-paper/10',
    4: 'bg-paper/5',
  };
  return (
    <section className="rounded-3xl bg-court-soft p-8">
      <h2 className="mb-6 flex items-center gap-3 font-display text-3xl font-bold uppercase tracking-wide">
        <TrophyIcon className="h-8 w-8 text-accent" /> Endstand
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {places.map((p) => (
          <div key={p.place} className={`rounded-2xl px-6 py-6 ${style[p.place]}`}>
            <span className="font-display text-5xl font-bold">{p.place}</span>
            <p className="mt-2 text-xl font-bold">{teamName(teams, p.teamId)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100svh] flex-col items-center justify-center bg-court px-6 text-center text-paper">
      {children}
    </div>
  );
}
