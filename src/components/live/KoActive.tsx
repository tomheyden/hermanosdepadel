import type { MatchFormat, MatchResult, Scenario, SetScore, SlotId, Team } from '../../types';
import type { ResolvedKoMatch } from '../../lib/bracket';
import { resolveBracket } from '../../lib/bracket';
import { computeQualification } from '../../lib/qualification';
import { evaluateMatch } from '../../lib/match';
import { activeKoMatches, nextKoSlot, koFinished } from '../../lib/koLive';
import { setWinsOf, koWinner, isGoldenPoint, isTieBreakSet, pointLabel } from '../../lib/tennis';
import { remainingSeconds, formatMMSS } from '../../lib/liveStatus';
import { teamName, formatLabel } from '../../lib/display';
import { useTicker } from '../../hooks/useTicker';
import { TrophyIcon } from '../icons';
import SetScoreboard from './SetScoreboard';

interface Props {
  scenario: Scenario;
  teams: Record<SlotId, Team>;
  results: Record<string, MatchResult>;
  startedAt: Record<string, number>;
  liveScores: Record<string, SetScore>;
  liveSets: Record<string, SetScore[]>;
  liveGame: Record<string, SetScore>;
  // tennis-scored KO (points → games → sets)
  onStartKo: (id: string) => void;
  onKoPoint: (id: string, side: 'home' | 'away', format: MatchFormat) => void;
  onKoPointBack: (id: string, side: 'home' | 'away', format: MatchFormat) => void;
  onFinishKo: (id: string) => void;
  onClearKo: (id: string) => void;
  // single-game KO (bonus, americano) — reuses the group flow
  onStartSlot: (ids: string[]) => void;
  onAdjustScore: (id: string, side: 'home' | 'away', delta: number) => void;
  onFinishMatch: (id: string) => void;
  onClearStart: (ids: string[]) => void;
}

export default function KoActive(props: Props) {
  const { scenario, teams, results, startedAt } = props;
  const now = useTicker();

  const qualification = computeQualification(scenario, teams, results);
  const bracket = resolveBracket(
    scenario,
    qualification.complete ? qualification.seeds : [],
    results,
    qualification.complete ? qualification.eliminated : [],
  );

  const active = activeKoMatches(bracket, startedAt, results);
  const nextSlot = nextKoSlot(bracket, startedAt, results);

  // start the whole parallel slot together (both courts at once)
  const startSlot = (matches: ResolvedKoMatch[]) => {
    for (const m of matches) {
      if (m.def.format.type === 'bestOfSets') props.onStartKo(m.def.id);
      else props.onStartSlot([m.def.id]);
    }
  };

  if (active.length > 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold uppercase">Aktive Spiele · KO</h2>
        <div className="grid gap-6 xl:grid-cols-2">
          {active.map((m) => (
            <KoMatchCard key={m.def.id} m={m} now={now} {...props} />
          ))}
        </div>
        {nextSlot.length > 0 && (
          <NextCard matches={nextSlot} teams={teams} compact onStart={() => startSlot(nextSlot)} />
        )}
      </div>
    );
  }

  if (nextSlot.length > 0) {
    return (
      <div>
        <h2 className="mb-6 text-3xl font-bold uppercase">Aktive Spiele · KO</h2>
        <NextCard matches={nextSlot} teams={teams} onStart={() => startSlot(nextSlot)} />
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-6 text-3xl font-bold uppercase">Aktive Spiele · KO</h2>
      <div className="rounded-3xl border border-ink/10 bg-white px-6 py-16 text-center">
        <TrophyIcon className="mx-auto h-10 w-10 text-court" />
        <p className="mt-4 text-lg font-semibold">
          {koFinished(bracket, results) ? 'Turnier beendet' : 'Warten auf die nächsten Teams'}
        </p>
        <p className="mt-1 text-muted">
          {koFinished(bracket, results)
            ? 'Alle KO-Spiele sind gespielt.'
            : 'Sobald die Paarungen feststehen, geht es hier weiter.'}
        </p>
      </div>
    </div>
  );
}

function NextCard({
  matches,
  teams,
  compact,
  onStart,
}: {
  matches: ResolvedKoMatch[];
  teams: Record<SlotId, Team>;
  compact?: boolean;
  onStart: () => void;
}) {
  const first = matches[0];
  const isSets = first.def.format.type === 'bestOfSets';
  return (
    <div className={`rounded-3xl border border-ink/10 bg-white text-center ${compact ? 'p-5' : 'p-8'}`}>
      <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-muted">
        Nächste Runde · {first.def.time} · {isSets ? formatLabel(first.def.format) : 'Americano'}
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        {matches.map((m) => (
          <div key={m.def.id} className="w-full max-w-xs rounded-2xl bg-paper p-4 text-center">
            <p className="font-display text-xs uppercase tracking-wide text-muted">
              {m.def.label} · Platz {m.def.court}
            </p>
            <p className="mt-1 font-semibold">{teamName(teams, m.homeTeam)}</p>
            <p className="text-muted">vs</p>
            <p className="font-semibold">{teamName(teams, m.awayTeam)}</p>
          </div>
        ))}
      </div>
      <button onClick={onStart} className={`btn-accent ${compact ? 'mt-4' : 'mt-7'}`}>
        ▶ {matches.length > 1 ? 'Beide Spiele starten' : 'Spiel starten'}
      </button>
    </div>
  );
}

function KoMatchCard({
  m,
  now,
  scenario,
  teams,
  startedAt,
  liveScores,
  liveSets,
  liveGame,
  onKoPoint,
  onKoPointBack,
  onFinishKo,
  onClearKo,
  onAdjustScore,
  onFinishMatch,
  onClearStart,
}: Props & { m: ResolvedKoMatch; now: number }) {
  const id = m.def.id;
  const format = m.def.format;
  const isSets = format.type === 'bestOfSets';
  const durationMin = isSets ? scenario.koMatchDurationMin : scenario.groupMatchDurationMin;
  const started = startedAt[id];
  const remaining = started ? remainingSeconds(started, durationMin, now) : 0;
  const over = remaining <= 0;
  const home = teamName(teams, m.homeTeam);
  const away = teamName(teams, m.awayTeam);

  const header = (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-muted">
        {m.def.label} · Platz {m.def.court}
      </p>
      <span
        className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-display text-lg font-bold tabular-nums ${
          over ? 'bg-red-100 text-red-700' : 'bg-court text-accent'
        }`}
      >
        <span className={`h-2.5 w-2.5 rounded-full ${over ? 'bg-red-600' : 'bg-accent'}`} />
        {over ? 'Zeit abgelaufen' : formatMMSS(remaining)}
      </span>
    </div>
  );

  // ── Single-game KO (bonus / americano) ─────────────────────────────────────
  if (!isSets) {
    const single = liveScores[id] ?? { home: 0, away: 0 };
    const outcome = evaluateMatch({ matchId: id, sets: [single] }, format);
    return (
      <div className="rounded-3xl border border-ink/10 bg-white p-6 md:p-8">
        {header}
        <div className="grid grid-cols-2 gap-3">
          <GameStepper name={home} value={single.home} big onMinus={() => onAdjustScore(id, 'home', -1)} onPlus={() => onAdjustScore(id, 'home', 1)} />
          <GameStepper name={away} value={single.away} big onMinus={() => onAdjustScore(id, 'away', -1)} onPlus={() => onAdjustScore(id, 'away', 1)} />
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button onClick={() => onFinishMatch(id)} disabled={outcome.winner === null} className="btn-accent disabled:cursor-not-allowed disabled:opacity-40">
            ✓ Spiel beenden
          </button>
          <button onClick={() => onClearStart([id])} className="rounded-full px-4 py-2 font-display text-sm font-semibold uppercase tracking-wide text-muted hover:text-red-600 cursor-pointer">
            Abbrechen
          </button>
        </div>
      </div>
    );
  }

  // ── Tennis-scored KO (points → games → sets, with a tie-break 3rd set) ──────
  const sets = liveSets[id] ?? [{ home: 0, away: 0 }];
  const game = liveGame[id] ?? { home: 0, away: 0 };
  const wins = setWinsOf(sets, format);
  const winner = koWinner(sets, format);
  const decided = winner !== null;
  const inTieBreak = isTieBreakSet(sets, format);
  const golden = !inTieBreak && isGoldenPoint(game);

  return (
    <div className="rounded-3xl border border-ink/10 bg-white p-6 md:p-8">
      {header}
      <SetScoreboard
        home={home}
        away={away}
        sets={sets}
        homeSetsWon={wins.home}
        awaySetsWon={wins.away}
        activeIndex={sets.length - 1}
        tieBreakIndex={format.tieBreakTarget ? 2 : undefined}
        gamePoints={decided || inTieBreak ? undefined : { home: pointLabel(game.home), away: pointLabel(game.away) }}
        goldenPoint={golden}
        winner={winner}
        variant="light"
      />

      {!decided && (
        <div className="mt-5 rounded-2xl bg-paper p-3">
          {inTieBreak && (
            <p className="mb-2 rounded-lg bg-court/10 px-3 py-1.5 text-center font-display text-xs font-bold uppercase tracking-wide text-court">
              Tie-Break · bis {format.tieBreakTarget} (normal gezählt)
            </p>
          )}
          {golden && (
            <p className="mb-2 rounded-lg bg-accent/20 px-3 py-1.5 text-center font-display text-xs font-bold uppercase tracking-wide text-accent-ink">
              Golden Point · der nächste Punkt entscheidet das Spiel
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <PointButton name={home} onPlus={() => onKoPoint(id, 'home', format)} onBack={() => onKoPointBack(id, 'home', format)} />
            <PointButton name={away} onPlus={() => onKoPoint(id, 'away', format)} onBack={() => onKoPointBack(id, 'away', format)} />
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {decided && (
          <button onClick={() => onFinishKo(id)} className="btn-accent">
            ✓ Spiel beenden
          </button>
        )}
        <button onClick={() => onClearKo(id)} className="rounded-full px-4 py-2 font-display text-sm font-semibold uppercase tracking-wide text-muted hover:text-red-600 cursor-pointer">
          Abbrechen
        </button>
      </div>
    </div>
  );
}

function PointButton({ name, onPlus, onBack }: { name: string; onPlus: () => void; onBack: () => void }) {
  return (
    <div className="rounded-xl bg-white p-3 text-center">
      <p className="mb-2 truncate text-sm font-semibold">{name}</p>
      <button
        onClick={onPlus}
        className="w-full rounded-full bg-accent py-3 font-display text-lg font-bold uppercase tracking-wide text-accent-ink transition-transform hover:-translate-y-0.5 active:scale-95 cursor-pointer"
      >
        + Punkt
      </button>
      <button
        onClick={onBack}
        className="mt-1.5 font-display text-xs font-semibold uppercase tracking-wide text-muted hover:text-ink cursor-pointer"
      >
        − zurück
      </button>
    </div>
  );
}

function GameStepper({
  name,
  value,
  big,
  onMinus,
  onPlus,
}: {
  name: string;
  value: number;
  big?: boolean;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <div className="rounded-xl bg-white p-3 text-center">
      <p className="mb-2 truncate text-sm font-semibold">{name}</p>
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={onMinus}
          aria-label={`${name} minus`}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/15 bg-white font-display text-xl font-bold text-ink transition-colors hover:border-court active:scale-95 cursor-pointer"
        >
          −
        </button>
        <span className={`w-12 text-center font-display font-bold tabular-nums text-court ${big ? 'text-5xl' : 'text-4xl'}`}>
          {value}
        </span>
        <button
          onClick={onPlus}
          aria-label={`${name} plus`}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-accent font-display text-xl font-bold text-accent-ink transition-transform hover:-translate-y-0.5 active:scale-95 cursor-pointer"
        >
          +
        </button>
      </div>
    </div>
  );
}
