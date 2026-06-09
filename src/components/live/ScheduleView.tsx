import { useEffect, useState } from 'react';
import type { GroupMatchDef, MatchResult, Scenario, SlotId, Team } from '../../types';
import { teamName } from '../../lib/display';
import { evaluateMatch } from '../../lib/match';
import { remainingSeconds, formatMMSS } from '../../lib/liveStatus';
import { minutesToTime, timeToMinutes } from '../../lib/schedule';
import { useTicker } from '../../hooks/useTicker';
import MatchRow from './MatchRow';

interface Props {
  scenario: Scenario;
  teams: Record<SlotId, Team>;
  results: Record<string, MatchResult>;
  startedAt: Record<string, number>;
  slotTimes: Record<string, string>;
  onSave: (r: MatchResult) => void;
  onClear: (matchId: string) => void;
  onStartSlot: (matchIds: string[]) => void;
  onClearStart: (matchIds: string[]) => void;
  onSetSlotTime: (baseTime: string, time: string) => void;
  onReflowTimes: (patch: Record<string, string>) => void;
  onResetTimes: () => void;
}

export default function ScheduleView({
  scenario,
  teams,
  results,
  startedAt,
  slotTimes,
  onSave,
  onClear,
  onStartSlot,
  onClearStart,
  onSetSlotTime,
  onReflowTimes,
  onResetTimes,
}: Props) {
  const now = useTicker();

  const done = scenario.groupSchedule.filter((m) => results[m.id]).length;
  const total = scenario.groupSchedule.length;
  const hasOverrides = Object.keys(slotTimes).length > 0;

  const slotIsDone = (matches: GroupMatchDef[]) =>
    matches.every((m) => evaluateMatch(results[m.id], m.format).complete);

  // Group by the STABLE base-slot key (both courts share a base time) — never by
  // the effective time, so colliding overrides can't merge unrelated slots. The
  // display order is the current (effective) time, so it always reads top-to-bottom.
  const bySlot = new Map<string, GroupMatchDef[]>();
  for (const m of scenario.groupSchedule) {
    const key = m.baseTime ?? m.time;
    if (!bySlot.has(key)) bySlot.set(key, []);
    bySlot.get(key)!.push(m);
  }
  const slotEntries = [...bySlot.entries()]
    .map(([baseTime, matches]) => {
      const slotMatches = [...matches].sort((a, b) => a.court - b.court);
      return { baseTime, slotMatches, time: slotMatches[0].time };
    })
    .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

  /** Re-time every not-yet-started, not-finished slot to run back-to-back from now.
   *  Idempotent: recomputes from scratch and never double-books a time already
   *  taken by a started/finished slot (so repeated clicks can't pile slots up). */
  const reflowFromNow = () => {
    const step = scenario.groupMatchDurationMin + 3; // match duration + court gap
    const isFixed = (s: { slotMatches: GroupMatchDef[] }) =>
      Boolean(startedAt[s.slotMatches[0].id]) || slotIsDone(s.slotMatches);
    const occupied = new Set<number>();
    for (const s of slotEntries) if (isFixed(s)) occupied.add(timeToMinutes(s.time));

    const d = new Date(now);
    let t = d.getHours() * 60 + d.getMinutes() + 3; // next slot in 3 min, then spaced
    const patch: Record<string, string> = {};
    for (const s of slotEntries) {
      if (isFixed(s)) continue; // leave running / finished slots where they are
      while (occupied.has(t)) t += step; // skip a minute already taken by a fixed slot
      patch[s.baseTime] = minutesToTime(t);
      occupied.add(t);
      t += step;
    }
    if (Object.keys(patch).length) onReflowTimes(patch);
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-3xl font-bold uppercase">Spielplan · Gruppenphase</h2>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-display text-sm font-semibold uppercase tracking-wide text-muted">
            {done}/{total} eingetragen
          </span>
          <button
            onClick={reflowFromNow}
            title="Alle offenen Slots ab jetzt direkt hintereinander legen"
            className="rounded-full border border-court/40 px-3.5 py-1.5 font-display text-sm font-semibold uppercase tracking-wide text-court transition-colors hover:border-court cursor-pointer"
          >
            ⏭ Restplan ab jetzt
          </button>
          {hasOverrides && (
            <button
              onClick={() => {
                if (window.confirm('Alle Zeiten auf den ursprünglichen Plan zurücksetzen?'))
                  onResetTimes();
              }}
              className="rounded-full border border-ink/15 px-3.5 py-1.5 font-display text-sm font-semibold uppercase tracking-wide text-muted transition-colors hover:border-ink hover:text-ink cursor-pointer"
            >
              ↺ Zeiten zurücksetzen
            </button>
          )}
        </div>
      </div>

      <div className="space-y-8">
        {slotEntries.map(({ baseTime, slotMatches, time }) => {
          const ids = slotMatches.map((m) => m.id);
          const overridden = baseTime in slotTimes;
          const started = startedAt[ids[0]];
          const allDone = slotMatches.every((m) => evaluateMatch(results[m.id], m.format).complete);
          const remaining = started
            ? remainingSeconds(started, scenario.groupMatchDurationMin, now)
            : null;

          return (
            <section key={baseTime}>
              <div className="mb-3 flex flex-wrap items-center gap-3">
                {started ? (
                  <StartedTime startedAt={started} plannedTime={time} />
                ) : (
                  <EditableTime
                    value={time}
                    overridden={overridden}
                    onCommit={(v) => onSetSlotTime(baseTime, v)}
                    onReset={() => onSetSlotTime(baseTime, '')}
                  />
                )}
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

/** A started slot: shows the ACTUAL start time + an "earlier/later than planned" badge. */
function StartedTime({ startedAt, plannedTime }: { startedAt: number; plannedTime: string }) {
  const d = new Date(startedAt);
  const actualMin = d.getHours() * 60 + d.getMinutes();
  const delta = actualMin - timeToMinutes(plannedTime); // < 0 = earlier than planned
  const actual = minutesToTime(actualMin);
  const early = delta <= -1;
  const late = delta >= 1;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="font-display text-xl font-bold text-court">{actual}</span>
      {early && (
        <span className="rounded-full bg-court/10 px-2.5 py-0.5 font-display text-xs font-bold uppercase tracking-wide text-court">
          Früher angefangen · {Math.abs(delta)} Min
        </span>
      )}
      {late && (
        <span className="rounded-full bg-red-100 px-2.5 py-0.5 font-display text-xs font-bold uppercase tracking-wide text-red-600">
          Später angefangen · {delta} Min
        </span>
      )}
      {(early || late) && (
        <span className="font-display text-xs text-muted line-through">geplant {plannedTime}</span>
      )}
    </span>
  );
}

/** Slot time shown as a button; click to edit (type=time). Marks overrides. */
function EditableTime({
  value,
  overridden,
  onCommit,
  onReset,
}: {
  value: string;
  overridden: boolean;
  onCommit: (time: string) => void;
  onReset: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  if (editing) {
    return (
      <input
        type="time"
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft && draft !== value) onCommit(draft);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            if (draft && draft !== value) onCommit(draft);
            setEditing(false);
          }
          if (e.key === 'Escape') setEditing(false);
        }}
        className="rounded-lg border border-court bg-white px-2 py-1 font-display text-xl font-bold tabular-nums text-court outline-none"
      />
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        onClick={() => setEditing(true)}
        title="Uhrzeit ändern"
        className={`font-display text-xl font-bold tabular-nums transition-colors hover:underline cursor-pointer ${
          overridden ? 'text-accent-ink' : 'text-court'
        }`}
      >
        {value}
      </button>
      {overridden && (
        <button
          onClick={onReset}
          title="Auf geplante Zeit zurücksetzen"
          className="font-display text-xs font-semibold uppercase tracking-wide text-muted hover:text-ink cursor-pointer"
        >
          ↺
        </button>
      )}
    </span>
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
