import type { GroupMatchDef, MatchResult, Scenario, SlotId, Team } from '../../types';
import { teamName } from '../../lib/display';
import { evaluateMatch } from '../../lib/match';
import { remainingSeconds, formatMMSS } from '../../lib/liveStatus';
import { useTicker } from '../../hooks/useTicker';
import MatchRow from './MatchRow';

interface Props {
  scenario: Scenario;
  teams: Record<SlotId, Team>;
  results: Record<string, MatchResult>;
  startedAt: Record<string, number>;
  onSave: (r: MatchResult) => void;
  onClear: (matchId: string) => void;
  onStartSlot: (matchIds: string[]) => void;
  onClearStart: (matchIds: string[]) => void;
}

export default function ScheduleView({
  scenario,
  teams,
  results,
  startedAt,
  onSave,
  onClear,
  onStartSlot,
  onClearStart,
}: Props) {
  const now = useTicker();

  // Group the chronological plan by time slot (both courts play together).
  const byTime = new Map<string, GroupMatchDef[]>();
  for (const m of scenario.groupSchedule) {
    if (!byTime.has(m.time)) byTime.set(m.time, []);
    byTime.get(m.time)!.push(m);
  }

  const done = scenario.groupSchedule.filter((m) => results[m.id]).length;
  const total = scenario.groupSchedule.length;

  return (
    <div>
      <div className="mb-6 flex items-baseline justify-between">
        <h2 className="text-3xl font-bold uppercase">Spielplan · Gruppenphase</h2>
        <span className="font-display text-sm font-semibold uppercase tracking-wide text-muted">
          {done}/{total} eingetragen
        </span>
      </div>

      <div className="space-y-8">
        {[...byTime.entries()].map(([time, matches]) => {
          const slotMatches = [...matches].sort((a, b) => a.court - b.court);
          const ids = slotMatches.map((m) => m.id);
          const started = startedAt[ids[0]];
          const allDone = slotMatches.every((m) => evaluateMatch(results[m.id], m.format).complete);
          const remaining = started
            ? remainingSeconds(started, scenario.groupMatchDurationMin, now)
            : null;

          return (
            <section key={time}>
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <span className="font-display text-xl font-bold text-court">{time}</span>
                <SlotTimer
                  started={Boolean(started)}
                  remaining={remaining}
                  allDone={allDone}
                  onStart={() => onStartSlot(ids)}
                  onRestart={() => onStartSlot(ids)}
                  onStop={() => onClearStart(ids)}
                />
                <span className="h-px flex-1 bg-ink/10" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {slotMatches.map((m) => {
                  const group = scenario.groups.find((g) => g.id === m.group);
                  return (
                    <MatchRow
                      key={m.id}
                      matchId={m.id}
                      time={m.time}
                      court={m.court}
                      meta={group?.label}
                      format={m.format}
                      homeLabel={teamName(teams, m.home)}
                      awayLabel={teamName(teams, m.away)}
                      result={results[m.id]}
                      editable
                      onSave={onSave}
                      onClear={onClear}
                    />
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function SlotTimer({
  started,
  remaining,
  allDone,
  onStart,
  onRestart,
  onStop,
}: {
  started: boolean;
  remaining: number | null;
  allDone: boolean;
  onStart: () => void;
  onRestart: () => void;
  onStop: () => void;
}) {
  if (allDone) {
    return (
      <span className="font-display text-sm font-semibold uppercase tracking-wide text-court">
        ✓ Slot fertig
      </span>
    );
  }

  if (!started) {
    return (
      <button
        onClick={onStart}
        className="rounded-full bg-accent px-4 py-1.5 font-display text-sm font-bold uppercase tracking-wide text-accent-ink transition-transform hover:-translate-y-0.5 cursor-pointer"
      >
        ▶ Slot starten
      </button>
    );
  }

  const over = (remaining ?? 0) <= 0;
  return (
    <div className="flex items-center gap-3">
      <span
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 font-display text-base font-bold tabular-nums ${
          over ? 'bg-red-100 text-red-700' : 'bg-court text-accent'
        }`}
      >
        <span className="relative flex h-2 w-2">
          {!over && (
            <span className="absolute inline-flex h-full w-full rounded-full bg-accent motion-safe:animate-ping" />
          )}
          <span className={`relative inline-flex h-2 w-2 rounded-full ${over ? 'bg-red-600' : 'bg-accent'}`} />
        </span>
        {over ? 'Zeit abgelaufen' : formatMMSS(remaining ?? 0)}
      </span>
      <button
        onClick={onRestart}
        className="font-display text-xs font-semibold uppercase tracking-wide text-muted underline-offset-2 hover:text-ink hover:underline cursor-pointer"
      >
        neu starten
      </button>
      <button
        onClick={onStop}
        className="font-display text-xs font-semibold uppercase tracking-wide text-muted underline-offset-2 hover:text-ink hover:underline cursor-pointer"
      >
        stoppen
      </button>
    </div>
  );
}
