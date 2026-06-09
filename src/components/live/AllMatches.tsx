import type { KoStage, MatchFormat, MatchResult, Scenario, SetScore, SlotId, SlotRef, Team } from '../../types';
import type { ResolvedKoMatch } from '../../lib/bracket';
import { evaluateMatch } from '../../lib/match';
import { matchStatus, remainingSeconds, formatMMSS, type LiveStatus } from '../../lib/liveStatus';
import { eliminatedLabel, seedLabel } from '../../lib/qualification';
import { minutesToTime, timeToMinutes } from '../../lib/schedule';
import { teamName } from '../../lib/display';
import { useTicker } from '../../hooks/useTicker';

interface Props {
  scenario: Scenario;
  teams: Record<SlotId, Team>;
  results: Record<string, MatchResult>;
  bracket: ResolvedKoMatch[];
  startedAt: Record<string, number>;
  liveScores: Record<string, SetScore>;
}

interface Row {
  id: string;
  time: string; // effective (current) clock time — for display
  baseTime: string; // stable original-plan time — for ordering / grouping
  court: 1 | 2;
  label: string;
  home: string;
  away: string;
  homeScore: string;
  awayScore: string;
  homeWon: boolean;
  awayWon: boolean;
  status: LiveStatus;
  remaining: number | null;
  /** KO stage (undefined for group-phase matches). */
  stage?: KoStage;
}

const STAGE_NAME: Record<KoStage, string> = {
  QF: 'Viertelfinale',
  SF: 'Halbfinale',
  F: 'Finale',
  P3: 'Spiel um Platz 3',
  BONUS: 'Finale der Herzen',
};

/** Phase label for a time-slot: the KO stage, or null for the group phase. */
function slotStageLabel(rows: Row[]): string | null {
  const stages = rows.map((r) => r.stage).filter(Boolean) as KoStage[];
  if (stages.length === 0) return null;
  if (stages.includes('F')) return 'Finale'; // final slot also holds P3
  return STAGE_NAME[stages[0]];
}

export default function AllMatches({ scenario, teams, results, bracket, startedAt, liveScores }: Props) {
  const nowMs = useTicker();

  const describe = (ref: SlotRef): string => {
    if (ref.type === 'seed') return seedLabel(scenario, ref.seed);
    if (ref.type === 'eliminated') return eliminatedLabel(ref.rank);
    const src = scenario.koSchedule.find((m) => m.id === ref.matchId);
    return `${ref.type === 'winner' ? 'Sieger' : 'Verlierer'} ${src?.label ?? ''}`.trim();
  };

  // resolve score + winner/lead for a match, preferring final result over live
  const cell = (id: string, format: MatchFormat) => {
    if (results[id]) {
      const out = evaluateMatch(results[id], format);
      return {
        home: results[id].sets.map((s) => s.home).join(' '),
        away: results[id].sets.map((s) => s.away).join(' '),
        homeWon: out.winner === 'home',
        awayWon: out.winner === 'away',
      };
    }
    const ls = liveScores[id];
    if (ls) {
      return {
        home: String(ls.home),
        away: String(ls.away),
        homeWon: ls.home > ls.away,
        awayWon: ls.away > ls.home,
      };
    }
    return { home: '', away: '', homeWon: false, awayWon: false };
  };

  const groupRows: Row[] = scenario.groupSchedule.map((m) => {
    const c = cell(m.id, m.format);
    const started = Boolean(startedAt[m.id]);
    const status = matchStatus(Boolean(results[m.id]), started);
    return {
      id: m.id,
      time: m.time,
      baseTime: m.baseTime ?? m.time,
      court: m.court,
      label: scenario.groups.find((g) => g.id === m.group)?.label ?? 'Gruppe',
      home: teamName(teams, m.home),
      away: teamName(teams, m.away),
      homeScore: c.home,
      awayScore: c.away,
      homeWon: c.homeWon,
      awayWon: c.awayWon,
      status,
      remaining:
        status === 'live' && startedAt[m.id]
          ? remainingSeconds(startedAt[m.id], scenario.groupMatchDurationMin, nowMs)
          : null,
    };
  });

  const koRows: Row[] = bracket.map((b) => {
    const c = cell(b.def.id, b.def.format);
    return {
      id: b.def.id,
      time: b.def.time,
      baseTime: b.def.baseTime ?? b.def.time,
      court: b.def.court,
      label: b.def.label,
      home: b.homeTeam ? teamName(teams, b.homeTeam) : describe(b.def.home),
      away: b.awayTeam ? teamName(teams, b.awayTeam) : describe(b.def.away),
      homeScore: c.home,
      awayScore: c.away,
      homeWon: c.homeWon,
      awayWon: c.awayWon,
      status: matchStatus(Boolean(results[b.def.id]), Boolean(startedAt[b.def.id])),
      remaining: null,
      stage: b.def.stage,
    };
  });

  // Stable display order: the FIXED original plan (baseTime), never the mutable
  // effective time — so a match keeps its position even when its time changes.
  const all = [...groupRows, ...koRows].sort(
    (a, b) => timeToMinutes(a.baseTime) - timeToMinutes(b.baseTime) || a.court - b.court,
  );

  const slots = new Map<string, Row[]>(); // keyed by baseTime (stable slot identity)
  for (const r of all) {
    if (!slots.has(r.baseTime)) slots.set(r.baseTime, []);
    slots.get(r.baseTime)!.push(r);
  }

  const liveCount = all.filter((r) => r.status === 'live').length;
  const doneCount = all.filter((r) => r.status === 'done').length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-3xl font-bold uppercase tracking-wide text-accent">
          Alle Spiele
        </h2>
        <span className="font-display text-sm font-semibold uppercase tracking-wide text-paper/60">
          {liveCount > 0 ? `${liveCount} live · ` : ''}
          {doneCount}/{all.length} gespielt
        </span>
      </div>

      <div className="space-y-7">
        {(() => {
          const entries = [...slots.entries()];
          const koStart = entries.findIndex(([, rows]) => rows.some((r) => r.stage));
          return entries.map(([baseKey, rows], i) => {
            const time = rows[0].time; // effective time to display for this slot
            const slotLive = rows.some((r) => r.status === 'live');
            const stageLabel = slotStageLabel(rows);
            const starts = rows.map((r) => startedAt[r.id]).filter(Boolean) as number[];
            const startedMs = starts.length ? Math.min(...starts) : null;
            return (
              <div key={baseKey}>
                {/* divider where the KO phase begins */}
                {koStart > 0 && i === koStart && (
                  <div className="mb-7 mt-2 flex items-center gap-3">
                    <span className="h-px flex-1 bg-accent/40" />
                    <span className="rounded-full bg-accent px-4 py-1 font-display text-sm font-bold uppercase tracking-[0.2em] text-accent-ink">
                      KO-Phase
                    </span>
                    <span className="h-px flex-1 bg-accent/40" />
                  </div>
                )}
                <section>
                  <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <SlotTime time={time} slotLive={slotLive} startedMs={startedMs} />
                    {stageLabel && (
                      <span className="font-display text-sm font-semibold uppercase tracking-wide text-paper/60">
                        {stageLabel}
                      </span>
                    )}
                    <span className="h-px flex-1 bg-paper/10" />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {rows.map((r) => (
                      <MatchCard key={r.id} row={r} />
                    ))}
                  </div>
                </section>
              </div>
            );
          });
        })()}
      </div>
    </div>
  );
}

/** Slot time: the planned time, or — once started — the ACTUAL start time + a
 *  "started earlier/later than planned" badge (driven by the persisted startedAt). */
function SlotTime({
  time,
  slotLive,
  startedMs,
}: {
  time: string;
  slotLive: boolean;
  startedMs: number | null;
}) {
  if (!startedMs) {
    return (
      <span className={`font-display text-xl font-bold ${slotLive ? 'text-accent' : 'text-paper/80'}`}>
        {time}
      </span>
    );
  }
  const d = new Date(startedMs);
  const delta = d.getHours() * 60 + d.getMinutes() - timeToMinutes(time);
  const actual = minutesToTime(d.getHours() * 60 + d.getMinutes());
  const early = delta <= -1;
  const late = delta >= 1;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className={`font-display text-xl font-bold ${slotLive ? 'text-accent' : 'text-paper/85'}`}>
        {actual}
      </span>
      {early && (
        <span className="rounded-full bg-accent/15 px-2.5 py-0.5 font-display text-xs font-bold uppercase tracking-wide text-accent">
          Früher · {Math.abs(delta)} Min
        </span>
      )}
      {late && (
        <span className="rounded-full bg-red-500/20 px-2.5 py-0.5 font-display text-xs font-bold uppercase tracking-wide text-red-300">
          Später · {delta} Min
        </span>
      )}
      {(early || late) && (
        <span className="font-display text-xs text-paper/40 line-through">geplant {time}</span>
      )}
    </span>
  );
}

function MatchCard({ row }: { row: Row }) {
  const live = row.status === 'live';
  const isFinal = row.stage === 'F';
  const isHerzen = row.stage === 'BONUS';
  const border = live
    ? 'border-accent ko-champion-glow'
    : isFinal
      ? 'border-accent/70 ko-champion-glow'
      : isHerzen
        ? 'border-accent/45'
        : 'border-paper/15';
  return (
    <div className={`overflow-hidden rounded-2xl border bg-court-soft/60 ${border}`}>
      <div className="flex items-center justify-between gap-2 border-b border-paper/10 px-4 py-2">
        <div className="flex min-w-0 items-center gap-2 text-xs">
          <span className="shrink-0 rounded-md bg-paper/10 px-2 py-0.5 font-display font-semibold uppercase tracking-wide text-paper/70">
            Platz {row.court}
          </span>
          <span
            className={`truncate font-display uppercase tracking-wide ${
              isFinal || isHerzen ? 'font-bold text-accent' : 'text-paper/55'
            }`}
          >
            {isFinal ? '🏆 ' : isHerzen ? '❤️ ' : ''}
            {row.label}
          </span>
        </div>
        <StatusBadge status={row.status} remaining={row.remaining} />
      </div>
      <div className="px-2 py-2">
        <ScoreLine name={row.home} score={row.homeScore} won={row.homeWon} />
        <div className="mx-3 h-px bg-paper/10" />
        <ScoreLine name={row.away} score={row.awayScore} won={row.awayWon} />
      </div>
    </div>
  );
}

function ScoreLine({ name, score, won }: { name: string; score: string; won: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 ${won ? 'bg-accent/20' : ''}`}>
      <span className={`min-w-0 flex-1 [overflow-wrap:anywhere] ${won ? 'font-bold text-paper' : 'text-paper/75'}`}>
        {name}
      </span>
      <span className={`font-display text-lg font-bold tabular-nums ${won ? 'text-accent' : 'text-paper/50'}`}>
        {score}
      </span>
    </div>
  );
}

function StatusBadge({ status, remaining }: { status: LiveStatus; remaining: number | null }) {
  if (status === 'live') {
    const over = remaining != null && remaining <= 0;
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-0.5 font-display text-xs font-bold uppercase tracking-wide text-accent-ink tabular-nums">
        <LiveDot dark />
        {remaining != null ? (over ? 'Live · 0:00' : `Live · ${formatMMSS(remaining)}`) : 'Live'}
      </span>
    );
  }
  if (status === 'done') {
    return (
      <span className="rounded-full bg-paper/10 px-2.5 py-0.5 font-display text-xs font-semibold uppercase tracking-wide text-paper/60">
        Beendet
      </span>
    );
  }
  return (
    <span className="rounded-full border border-paper/20 px-2.5 py-0.5 font-display text-xs font-semibold uppercase tracking-wide text-paper/55">
      Geplant
    </span>
  );
}

function LiveDot({ dark = false }: { dark?: boolean }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span
        className={`absolute inline-flex h-full w-full rounded-full motion-safe:animate-ping ${
          dark ? 'bg-accent-ink/60' : 'bg-accent'
        }`}
      />
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${dark ? 'bg-accent-ink' : 'bg-accent'}`} />
    </span>
  );
}
