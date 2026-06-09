import type { MatchResult, Scenario, SetScore, SlotId, Team } from '../../types';
import type { ResolvedKoMatch } from '../../lib/bracket';
import { resolveBracket } from '../../lib/bracket';
import { computeQualification } from '../../lib/qualification';
import { evaluateMatch } from '../../lib/match';
import { activeKoMatches, nextKoSlot, koFinished } from '../../lib/koLive';
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
  // best-of-sets KO (played set by set)
  onStartKo: (id: string) => void;
  onAdjustKo: (id: string, setIndex: number, side: 'home' | 'away', delta: number) => void;
  onEndKo: (id: string) => void;
  onUndoKo: (id: string) => void;
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
      <div className="mx-auto mt-4 grid max-w-2xl gap-3 sm:grid-cols-2">
        {matches.map((m) => (
          <div key={m.def.id} className="rounded-2xl bg-paper p-4 text-left">
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
  onAdjustKo,
  onEndKo,
  onUndoKo,
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
        <Buttons
          canFinish={outcome.winner !== null}
          onFinish={() => onFinishMatch(id)}
          onCancel={() => onClearStart([id])}
        />
      </div>
    );
  }

  // ── Best-of-3 sets, played set by set ──────────────────────────────────────
  const sets = liveSets[id] ?? [{ home: 0, away: 0 }];
  const activeIdx = sets.length - 1;
  const activeSet = sets[activeIdx] ?? { home: 0, away: 0 };
  const outcome = evaluateMatch({ matchId: id, sets: sets.filter((s) => s.home || s.away) }, format);
  const decided = outcome.winner !== null;
  const activeHasWinner = activeSet.home !== activeSet.away;
  const canEndSet = !decided && activeHasWinner && sets.length < 3;
  const canUndo = sets.length > 1 && activeSet.home === 0 && activeSet.away === 0;
  const tieBreakIndex = format.tieBreakTarget ? 2 : undefined;
  const isTieBreakActive = activeIdx === 2 && !!format.tieBreakTarget;

  return (
    <div className="rounded-3xl border border-ink/10 bg-white p-6 md:p-8">
      {header}
      <SetScoreboard
        home={home}
        away={away}
        sets={sets}
        homeSetsWon={outcome.homeSetsWon}
        awaySetsWon={outcome.awaySetsWon}
        activeIndex={activeIdx}
        tieBreakIndex={tieBreakIndex}
        winner={outcome.winner}
        variant="light"
      />

      <div className="mt-5 rounded-2xl bg-paper p-3">
        <p className="mb-2 text-center font-display text-xs font-semibold uppercase tracking-wide text-muted">
          {isTieBreakActive ? `Tie-Break bis ${format.tieBreakTarget}` : `Satz ${activeIdx + 1}`}
          {decided ? ' · Entscheidung gefallen' : ' läuft'}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <GameStepper name={home} value={activeSet.home} onMinus={() => onAdjustKo(id, activeIdx, 'home', -1)} onPlus={() => onAdjustKo(id, activeIdx, 'home', 1)} />
          <GameStepper name={away} value={activeSet.away} onMinus={() => onAdjustKo(id, activeIdx, 'away', -1)} onPlus={() => onAdjustKo(id, activeIdx, 'away', 1)} />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {decided ? (
          <button onClick={() => onFinishKo(id)} className="btn-accent">
            ✓ Spiel beenden
          </button>
        ) : (
          <button
            onClick={() => onEndKo(id)}
            disabled={!canEndSet}
            className="btn-accent disabled:cursor-not-allowed disabled:opacity-40"
            title={canEndSet ? '' : 'Satz braucht einen Sieger'}
          >
            ✓ Satz beenden →
          </button>
        )}
        {canUndo && (
          <button
            onClick={() => onUndoKo(id)}
            className="rounded-full border border-ink/15 px-4 py-2 font-display text-sm font-semibold uppercase tracking-wide text-muted transition-colors hover:border-ink hover:text-ink cursor-pointer"
          >
            Satz zurück
          </button>
        )}
        <button
          onClick={() => onClearKo(id)}
          className="rounded-full px-4 py-2 font-display text-sm font-semibold uppercase tracking-wide text-muted transition-colors hover:text-red-600 cursor-pointer"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}

function Buttons({
  canFinish,
  onFinish,
  onCancel,
}: {
  canFinish: boolean;
  onFinish: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
      <button
        onClick={onFinish}
        disabled={!canFinish}
        className="btn-accent disabled:cursor-not-allowed disabled:opacity-40"
        title={canFinish ? '' : 'Es muss ein Sieger feststehen'}
      >
        ✓ Spiel beenden
      </button>
      <button
        onClick={onCancel}
        className="rounded-full px-4 py-2 font-display text-sm font-semibold uppercase tracking-wide text-muted transition-colors hover:text-red-600 cursor-pointer"
      >
        Abbrechen
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
