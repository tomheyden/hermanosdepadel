import { useState } from 'react';
import type { MatchResult, Scenario, SetScore, SlotId, Team } from '../../types';
import { teamName } from '../../lib/display';
import { remainingSeconds, formatMMSS } from '../../lib/liveStatus';
import { activeGroupMatches } from '../../lib/activeGames';
import { slotTimeline, nextActionSlot, formatRemaining } from '../../lib/timeline';
import { useTicker } from '../../hooks/useTicker';
import { TrophyIcon } from '../icons';
import KoActive from './KoActive';

interface Props {
  scenario: Scenario;
  tournamentDate?: string;
  teams: Record<SlotId, Team>;
  results: Record<string, MatchResult>;
  startedAt: Record<string, number>;
  liveScores: Record<string, SetScore>;
  liveSets: Record<string, SetScore[]>;
  liveGame: Record<string, SetScore>;
  onStartSlot: (ids: string[]) => void;
  onClearStart: (ids: string[]) => void;
  onAdjust: (id: string, side: 'home' | 'away', delta: number) => void;
  onFinish: (id: string) => void;
  onStartKo: (id: string) => void;
  onKoPoint: (id: string, side: 'home' | 'away') => void;
  onKoPointBack: (id: string, side: 'home' | 'away') => void;
  onFinishKo: (id: string) => void;
  onClearKo: (id: string) => void;
}

export default function ActiveGamesAdmin(props: Props) {
  const {
    scenario,
    tournamentDate,
    teams,
    results,
    startedAt,
    liveScores,
    onStartSlot,
    onClearStart,
    onAdjust,
    onFinish,
  } = props;
  const now = useTicker();
  const active = activeGroupMatches(scenario, startedAt, results);
  const [selId, setSelId] = useState<string | null>(null);
  const selected = active.find((m) => m.id === selId) ?? active[0] ?? null;

  // ── No active group game: next group slot, or hand over to the KO flow ──────
  if (!selected) {
    const next = nextActionSlot(slotTimeline(scenario, tournamentDate, startedAt, results, now));
    // group phase fully played → live KO scoring takes over
    if (!next) {
      return (
        <KoActive
          scenario={scenario}
          teams={teams}
          results={results}
          startedAt={startedAt}
          liveScores={liveScores}
          liveSets={props.liveSets}
          liveGame={props.liveGame}
          onStartKo={props.onStartKo}
          onKoPoint={props.onKoPoint}
          onKoPointBack={props.onKoPointBack}
          onFinishKo={props.onFinishKo}
          onClearKo={props.onClearKo}
          onStartSlot={onStartSlot}
          onAdjustScore={onAdjust}
          onFinishMatch={onFinish}
          onClearStart={onClearStart}
        />
      );
    }
    const due = next.status === 'due';
    const untilMs = next.epoch != null ? next.epoch - now : null;
    return (
      <div>
        <h2 className="mb-6 text-3xl font-bold uppercase">Aktive Spiele</h2>
        {next ? (
          <div
            className={`rounded-3xl border bg-white p-8 text-center ${
              due ? 'border-red-300 ring-1 ring-red-200' : 'border-ink/10'
            }`}
          >
            <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-muted">
              Nächster Slot · geplant {next.time}
            </p>
            <p className="mt-1 font-display text-4xl font-bold text-court">{next.time}</p>
            {/* time-to / overdue badge */}
            {untilMs != null && (
              <p
                className={`mt-3 inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-display text-sm font-bold uppercase tracking-wide ${
                  due ? 'bg-red-100 text-red-700' : 'bg-court/10 text-court'
                }`}
              >
                {due ? (
                  <>● Überfällig · seit {formatRemaining(-untilMs)}</>
                ) : (
                  <>Startet in {formatRemaining(untilMs)}</>
                )}
              </p>
            )}
            <div className="mx-auto mt-6 grid max-w-2xl gap-3 sm:grid-cols-2">
              {next.matches.map((m) => (
                <div key={m.id} className="rounded-xl bg-paper p-4 text-left">
                  <p className="font-display text-xs uppercase tracking-wide text-muted">
                    Platz {m.court}
                  </p>
                  <p className="mt-1 font-semibold">{teamName(teams, m.home)}</p>
                  <p className="text-muted">vs</p>
                  <p className="font-semibold">{teamName(teams, m.away)}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => onStartSlot(next.matches.map((m) => m.id))}
              className="mt-7 btn-accent"
            >
              ▶ Beide Spiele starten
            </button>
          </div>
        ) : (
          <div className="rounded-3xl border border-ink/10 bg-white px-6 py-16 text-center">
            <TrophyIcon className="mx-auto h-10 w-10 text-court" />
            <p className="mt-4 text-lg font-semibold">Alle Gruppenspiele gespielt</p>
            <p className="mt-1 text-muted">Weiter geht's im KO-Baum.</p>
          </div>
        )}
      </div>
    );
  }

  // ── Active game scorer ─────────────────────────────────────────────────────
  const started = startedAt[selected.id];
  const remaining = started ? remainingSeconds(started, scenario.groupMatchDurationMin, now) : 0;
  const over = remaining <= 0;
  const score = liveScores[selected.id] ?? { home: 0, away: 0 };
  const group = scenario.groups.find((g) => g.id === selected.group);
  const slotIds = active.filter((m) => startedAt[m.id] === started).map((m) => m.id);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-3xl font-bold uppercase">Aktive Spiele</h2>
        <span
          className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-display text-lg font-bold tabular-nums ${
            over ? 'bg-red-100 text-red-700' : 'bg-court text-accent'
          }`}
        >
          <span className="relative flex h-2.5 w-2.5">
            {!over && (
              <span className="absolute inline-flex h-full w-full rounded-full bg-accent motion-safe:animate-ping" />
            )}
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${over ? 'bg-red-600' : 'bg-accent'}`} />
          </span>
          {over ? 'Zeit abgelaufen' : formatMMSS(remaining)}
        </span>
      </div>

      {/* court switch */}
      {active.length > 1 && (
        <div className="mb-5 flex gap-2">
          {active.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelId(m.id)}
              className={`min-w-0 flex-1 rounded-xl border px-4 py-3 text-left transition-colors cursor-pointer ${
                m.id === selected.id
                  ? 'border-court bg-court text-paper'
                  : 'border-ink/15 bg-white hover:border-court'
              }`}
            >
              <p className="font-display text-sm font-bold uppercase tracking-wide">
                Platz {m.court}
              </p>
              <p className={`truncate text-sm ${m.id === selected.id ? 'text-paper/80' : 'text-muted'}`}>
                {teamName(teams, m.home)} vs {teamName(teams, m.away)}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* scorer */}
      <div className="rounded-3xl border border-ink/10 bg-white p-6 md:p-8">
        <p className="text-center font-display text-sm font-semibold uppercase tracking-[0.2em] text-muted">
          Platz {selected.court} · {group?.label}
        </p>

        <div className="mt-6 space-y-4">
          <ScoreRow
            name={teamName(teams, selected.home)}
            value={score.home}
            onMinus={() => onAdjust(selected.id, 'home', -1)}
            onPlus={() => onAdjust(selected.id, 'home', 1)}
          />
          <div className="text-center font-display text-sm uppercase tracking-[0.3em] text-muted">
            gegen
          </div>
          <ScoreRow
            name={teamName(teams, selected.away)}
            value={score.away}
            onMinus={() => onAdjust(selected.id, 'away', -1)}
            onPlus={() => onAdjust(selected.id, 'away', 1)}
          />
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => onFinish(selected.id)}
            className="btn-accent"
            disabled={score.home === score.away}
            title={score.home === score.away ? 'Unentschieden — Golden Point entscheidet' : ''}
          >
            ✓ Spiel beenden
          </button>
          <button
            onClick={() => onStartSlot(slotIds)}
            className="rounded-full border border-ink/15 px-4 py-2 font-display text-sm font-semibold uppercase tracking-wide text-muted transition-colors hover:border-ink hover:text-ink cursor-pointer"
          >
            Timer neu starten
          </button>
          <button
            onClick={() => onClearStart([selected.id])}
            className="rounded-full px-4 py-2 font-display text-sm font-semibold uppercase tracking-wide text-muted transition-colors hover:text-red-600 cursor-pointer"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}

function ScoreRow({
  name,
  value,
  onMinus,
  onPlus,
}: {
  name: string;
  value: number;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-paper p-4">
      <span className="min-w-0 flex-1 text-xl font-bold leading-tight">{name}</span>
      <div className="flex items-center gap-3">
        <button
          onClick={onMinus}
          aria-label={`${name} minus`}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-ink/15 bg-white font-display text-2xl font-bold text-ink transition-colors hover:border-court active:scale-95 cursor-pointer"
        >
          −
        </button>
        <span className="w-14 text-center font-display text-5xl font-bold tabular-nums text-court">
          {value}
        </span>
        <button
          onClick={onPlus}
          aria-label={`${name} plus`}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-accent font-display text-2xl font-bold text-accent-ink transition-transform hover:-translate-y-0.5 active:scale-95 cursor-pointer"
        >
          +
        </button>
      </div>
    </div>
  );
}
