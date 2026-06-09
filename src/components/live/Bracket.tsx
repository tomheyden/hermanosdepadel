import type { KoStage, MatchResult, Scenario, SetScore, SlotId, SlotRef, Team } from '../../types';
import { computeBonusStandings, type ResolvedKoMatch } from '../../lib/bracket';
import { evaluateMatch } from '../../lib/match';
import { eliminatedLabel, seedLabel } from '../../lib/qualification';
import { teamName } from '../../lib/display';
import { TrophyIcon } from '../icons';

// ============================================================================
//  Shared epic KO bracket — dark "arena" tree with connector lines, seed
//  badges, a glowing final and a 3rd-place card. Used by both the Admin
//  dashboard (with `onEdit` → edit buttons) and the read-only Turnier view
//  (no `onEdit`). Render it on a dark (court) surface.
// ============================================================================

const STAGE_TITLES: Record<KoStage, string> = {
  QF: 'Viertelfinale',
  SF: 'Halbfinale',
  F: 'Finale',
  P3: 'Spiel um Platz 3',
  BONUS: 'Finale der Herzen',
};

// bracket column: fixed width + horizontal scroll on mobile, fills the row on lg.
const COL =
  'flex w-[78vw] max-w-[18rem] shrink-0 flex-col sm:w-72 lg:w-auto lg:max-w-none lg:flex-1';

interface Props {
  scenario: Scenario;
  teams: Record<SlotId, Team>;
  results: Record<string, MatchResult>;
  bracket: ResolvedKoMatch[];
  /** best→worst non-qualifier ranking; enables the bonus round labels + worst team. */
  eliminated?: SlotId[];
  /** live state, so the tree shows running KO matches (scores + highlight). */
  startedAt?: Record<string, number>;
  liveScores?: Record<string, SetScore>;
  liveSets?: Record<string, SetScore[]>;
  /** Provide to enable editing (Admin). Omit for the read-only Turnier view. */
  onEdit?: (matchId: string) => void;
}

export default function Bracket({
  scenario,
  teams,
  results,
  bracket,
  eliminated = [],
  startedAt = {},
  liveScores = {},
  liveSets = {},
  onEdit,
}: Props) {
  const byStage = (s: KoStage) => bracket.filter((m) => m.def.stage === s);
  const qf = byStage('QF');
  const sf = byStage('SF');
  const final = byStage('F')[0];
  const p3 = byStage('P3')[0];
  const bonus = byStage('BONUS');

  // non-final rounds (each a vertical stack of matches that pair into the next)
  const treeRounds: ResolvedKoMatch[][] = qf.length ? [qf, sf] : [sf];

  const describe = (ref: SlotRef): string => {
    if (ref.type === 'seed') return seedLabel(scenario, ref.seed);
    if (ref.type === 'eliminated') return eliminatedLabel(ref.rank, eliminated.length || 4);
    const src = scenario.koSchedule.find((m) => m.id === ref.matchId);
    return `${ref.type === 'winner' ? 'Sieger' : 'Verlierer'} ${src?.label ?? ''}`.trim();
  };

  const ctx = { teams, results, describe, onEdit, startedAt, liveScores, liveSets };
  const worstTeamId = computeBonusStandings(bracket, eliminated)?.worstTeamId ?? null;

  return (
    <div>
      {/* tournament tree — every match sits in an equal-height flex cell so the
          connector lines always meet the cards on their centres. All columns
          stretch to the same height (items-stretch), so pair midpoints line up
          exactly with the next round's match centre. On mobile the whole tree
          scrolls horizontally; on lg it fills the width (flex-1 columns). */}
      <div className="overflow-x-auto pb-2">
        <div className="flex items-stretch gap-12">
          {treeRounds.map((round, ri) => (
            <div key={ri} className={COL}>
              <RoundHeader title={STAGE_TITLES[round[0].def.stage]} />
              <div className="flex flex-1 flex-col">
                {round.map((m, i) => (
                  <div
                    key={m.def.id}
                    className={`ko-cell flex flex-1 flex-col justify-center py-3 ${
                      i % 2 === 0 ? 'ko-top' : 'ko-bottom'
                    }`}
                  >
                    <Card variant="match" m={m} {...ctx} />
                  </div>
                ))}
              </div>
            </div>
          ))}
          {/* final column — the card centred so the SF pair midpoint lands on it */}
          <div className={COL}>
            <RoundHeader title="Finale" />
            <div className="flex flex-1 flex-col justify-center">
              <Card variant="final" m={final} {...ctx} />
            </div>
          </div>
        </div>
      </div>

      {/* 3rd-place match sits apart from the tree (it's fed by the SF losers). */}
      {p3 && (
        <div className="mt-10 border-t border-paper/10 pt-8">
          <div className="lg:max-w-md">
            <Card variant="p3" m={p3} {...ctx} />
          </div>
        </div>
      )}

      {/* Bonus round — the 4 group-phase non-qualifiers; last is the worst team. */}
      {bonus.length > 0 && (
        <div className="mt-10 border-t border-paper/10 pt-8">
          <RoundHeader title="Finale der Herzen · um den Pokal & das Worst Team" />
          <div className="grid gap-6 md:grid-cols-2 lg:max-w-3xl">
            {bonus.map((m) => (
              <Card key={m.def.id} variant="match" m={m} {...ctx} />
            ))}
          </div>
          {worstTeamId && (
            <div className="mt-6 flex items-center gap-4 rounded-2xl bg-paper/5 px-5 py-4 lg:max-w-3xl">
              <TrophyIcon className="h-8 w-8 shrink-0 text-paper/60" />
              <div>
                <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-paper/55">
                  Worst Team of the Tournament
                </p>
                <p className="font-display text-2xl font-bold">{teamName(teams, worstTeamId)}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RoundHeader({ title }: { title: string }) {
  return (
    <div className="mb-6 flex items-center gap-2">
      <span className="h-2 w-2 rounded-full bg-accent" />
      <h3 className="font-display text-lg font-bold uppercase tracking-[0.18em]">{title}</h3>
    </div>
  );
}

const seedOf = (ref: SlotRef): number | null => (ref.type === 'seed' ? ref.seed : null);

interface CardCtx {
  teams: Record<SlotId, Team>;
  results: Record<string, MatchResult>;
  describe: (ref: SlotRef) => string;
  startedAt?: Record<string, number>;
  liveScores?: Record<string, SetScore>;
  liveSets?: Record<string, SetScore[]>;
  onEdit?: (matchId: string) => void;
}

function Card({
  variant,
  m,
  teams,
  results,
  describe,
  startedAt = {},
  liveScores = {},
  liveSets = {},
  onEdit,
}: CardCtx & { variant: 'match' | 'final' | 'p3'; m: ResolvedKoMatch }) {
  const id = m.def.id;
  const ready = Boolean(m.homeTeam && m.awayTeam);
  const hasResult = Boolean(results[id]);
  const live = !hasResult && Boolean(startedAt[id]) && ready;

  // effective sets: final result, else the in-progress live score (sets or single)
  const liveArr =
    m.def.format.type === 'bestOfSets'
      ? liveSets[id]
      : liveScores[id]
        ? [liveScores[id]]
        : undefined;
  const sets = hasResult ? results[id].sets : live ? (liveArr ?? []) : [];
  const out = evaluateMatch({ matchId: id, sets: sets.filter((s) => s.home || s.away) }, m.def.format);

  const homeLabel = m.homeTeam ? teamName(teams, m.homeTeam) : describe(m.def.home);
  const awayLabel = m.awayTeam ? teamName(teams, m.awayTeam) : describe(m.def.away);
  const tieBreakIndex =
    m.def.format.type === 'bestOfSets' && m.def.format.tieBreakTarget && sets.length >= 3 ? 2 : -1;

  const editable = Boolean(onEdit);
  const lines = (
    <>
      {live && (
        <div className="mb-1 flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-0.5 font-display text-[0.65rem] font-bold uppercase tracking-wide text-accent-ink">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-ink" /> Live
          </span>
        </div>
      )}
      <TeamLine label={homeLabel} seed={seedOf(m.def.home)} games={sets.map((s) => s.home)} tieBreakIndex={tieBreakIndex} won={out.winner === 'home'} />
      <div className="mx-3 h-px bg-paper/10" />
      <TeamLine label={awayLabel} seed={seedOf(m.def.away)} games={sets.map((s) => s.away)} tieBreakIndex={tieBreakIndex} won={out.winner === 'away'} />
    </>
  );

  // ── Finale (climax card) ────────────────────────────────────────────────
  if (variant === 'final') {
    return (
      <div className={`rounded-2xl bg-court-soft p-1 ${out.complete || live ? 'ko-champion-glow' : 'border border-accent/40'}`}>
        <div className="rounded-xl bg-court/60 px-2 py-3">
          <div className="mb-2 flex items-center justify-center gap-2">
            <TrophyIcon className="h-5 w-5 text-accent" />
            <span className="font-display text-sm font-bold uppercase tracking-[0.2em] text-accent">Finale</span>
            <span className="font-display text-xs text-paper/45">· {m.def.time}</span>
          </div>
          {lines}
          {editable && (
            <div className="px-2 pt-3">
              {ready ? (
                <button
                  onClick={() => onEdit!(m.def.id)}
                  className="w-full rounded-full bg-accent px-3 py-2 font-display text-sm font-bold uppercase tracking-wide text-accent-ink transition-transform hover:-translate-y-0.5 cursor-pointer"
                >
                  {hasResult ? 'Finale bearbeiten' : 'Finale eintragen'}
                </button>
              ) : (
                <p className="text-center text-xs text-paper/40">wartet auf die Halbfinal-Sieger</p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── 3rd-place card ──────────────────────────────────────────────────────
  if (variant === 'p3') {
    return (
      <div className={`rounded-2xl bg-court-soft/40 ${live ? 'border border-accent ko-champion-glow' : 'border border-paper/10'}`}>
        <div className="px-4 pt-3 text-center font-display text-xs font-semibold uppercase tracking-[0.18em] text-paper/55">
          Spiel um Platz 3 · {m.def.time}
        </div>
        <div className="px-2 py-2">{lines}</div>
        {editable && (
          <div className="px-4 pb-3">
            {ready ? (
              <button
                onClick={() => onEdit!(m.def.id)}
                className="w-full rounded-full border border-paper/25 px-3 py-1.5 font-display text-xs font-semibold uppercase tracking-wide text-paper/80 transition-colors hover:border-accent hover:text-accent cursor-pointer"
              >
                {hasResult ? 'Bearbeiten' : 'Ergebnis eintragen'}
              </button>
            ) : (
              <p className="text-center text-xs text-paper/40">wartet auf die Verlierer der Halbfinals</p>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Regular match (QF/SF) ───────────────────────────────────────────────
  return (
    <div
      className={`ko-match rounded-2xl bg-court-soft/70 backdrop-blur-sm ${
        live ? 'border border-accent ko-champion-glow' : 'border border-paper/15'
      }`}
    >
      <div className="flex items-center justify-between px-4 pt-3 text-xs">
        <span className="font-display uppercase tracking-wide text-paper/60">{m.def.label}</span>
        <span className="font-display tracking-wide text-paper/45">{m.def.time} · P{m.def.court}</span>
      </div>
      <div className="px-2 py-2">{lines}</div>
      {editable ? (
        <div className="px-4 pb-3">
          {ready ? (
            <button
              onClick={() => onEdit!(m.def.id)}
              className="w-full rounded-full border border-accent/50 px-3 py-1.5 font-display text-xs font-semibold uppercase tracking-wide text-accent transition-colors hover:bg-accent hover:text-accent-ink cursor-pointer"
            >
              {hasResult ? 'Bearbeiten' : 'Ergebnis eintragen'}
            </button>
          ) : (
            <p className="text-center text-xs text-paper/40">wartet auf Teams</p>
          )}
        </div>
      ) : (
        !ready && <p className="px-4 pb-3 text-center text-xs text-paper/40">wartet auf Teams</p>
      )}
    </div>
  );
}

function TeamLine({
  label,
  seed,
  games,
  tieBreakIndex,
  won,
}: {
  label: string;
  seed: number | null;
  games: number[];
  tieBreakIndex: number;
  won: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 rounded-xl px-3 py-2 ${won ? 'bg-accent/20' : ''}`}>
      {seed != null && (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-paper/10 font-display text-[0.65rem] font-bold text-paper/70">
          {seed}
        </span>
      )}
      <span className={`min-w-0 flex-1 [overflow-wrap:anywhere] ${won ? 'font-bold text-paper' : 'text-paper/75'}`}>
        {label}
      </span>
      {/* one box per set; the tie-break box is marked with a ring */}
      <div className="flex flex-shrink-0 gap-1">
        {games.map((g, i) => (
          <span
            key={i}
            className={`flex h-7 w-7 items-center justify-center rounded-md font-display text-base font-bold tabular-nums ${
              i === tieBreakIndex
                ? 'bg-black/20 text-accent ring-1 ring-accent/60'
                : won
                  ? 'bg-accent/20 text-accent'
                  : 'bg-black/20 text-paper/55'
            }`}
          >
            {g}
          </span>
        ))}
      </div>
    </div>
  );
}
