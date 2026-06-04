import type { KoStage, MatchResult, Scenario, SlotId, SlotRef, Team } from '../../types';
import type { ResolvedKoMatch } from '../../lib/bracket';
import { evaluateMatch } from '../../lib/match';
import { seedLabel } from '../../lib/qualification';
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
};

interface Props {
  scenario: Scenario;
  teams: Record<SlotId, Team>;
  results: Record<string, MatchResult>;
  bracket: ResolvedKoMatch[];
  /** Provide to enable editing (Admin). Omit for the read-only Turnier view. */
  onEdit?: (matchId: string) => void;
}

export default function Bracket({ scenario, teams, results, bracket, onEdit }: Props) {
  const byStage = (s: KoStage) => bracket.filter((m) => m.def.stage === s);
  const qf = byStage('QF');
  const sf = byStage('SF');
  const final = byStage('F')[0];
  const p3 = byStage('P3')[0];

  const rounds = [qf.length ? qf : null, sf, [final]].filter(Boolean) as ResolvedKoMatch[][];

  const describe = (ref: SlotRef): string => {
    if (ref.type === 'seed') return seedLabel(scenario, ref.seed);
    const src = scenario.koSchedule.find((m) => m.id === ref.matchId);
    return `${ref.type === 'winner' ? 'Sieger' : 'Verlierer'} ${src?.label ?? ''}`.trim();
  };

  const ctx = { teams, results, describe, onEdit };

  return (
    <div>
      {/* tournament tree — final column holds ONLY the final (centred) so the
          connector lines from each round land on the next match's centre. */}
      <div className="flex flex-col gap-10 lg:flex-row lg:items-stretch lg:gap-12">
        {rounds.map((round, ri) => {
          const isFinalCol = ri === rounds.length - 1;
          return (
            <div key={ri} className="flex flex-1 flex-col">
              <RoundHeader title={isFinalCol ? 'Finale' : STAGE_TITLES[round[0].def.stage]} />
              {isFinalCol ? (
                <div className="flex flex-1 flex-col justify-center">
                  <Card variant="final" m={final} {...ctx} />
                </div>
              ) : (
                <div className="flex flex-1 flex-col justify-around gap-8">
                  {chunkPairs(round).map((pair, pi) => (
                    <div key={pi} className="ko-pair has-next flex flex-col justify-around gap-8">
                      {pair.map((m) => (
                        <Card key={m.def.id} variant="match" m={m} {...ctx} />
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 3rd-place match sits apart from the tree (it's fed by the SF losers). */}
      {p3 && (
        <div className="mt-10 border-t border-paper/10 pt-8">
          <div className="lg:max-w-md">
            <Card variant="p3" m={p3} {...ctx} />
          </div>
        </div>
      )}
    </div>
  );
}

function chunkPairs(matches: ResolvedKoMatch[]): ResolvedKoMatch[][] {
  const out: ResolvedKoMatch[][] = [];
  for (let i = 0; i < matches.length; i += 2) out.push(matches.slice(i, i + 2));
  return out;
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
  onEdit?: (matchId: string) => void;
}

function Card({
  variant,
  m,
  teams,
  results,
  describe,
  onEdit,
}: CardCtx & { variant: 'match' | 'final' | 'p3'; m: ResolvedKoMatch }) {
  const out = evaluateMatch(results[m.def.id], m.def.format);
  const ready = Boolean(m.homeTeam && m.awayTeam);
  const hasResult = Boolean(results[m.def.id]);
  const homeLabel = m.homeTeam ? teamName(teams, m.homeTeam) : describe(m.def.home);
  const awayLabel = m.awayTeam ? teamName(teams, m.awayTeam) : describe(m.def.away);
  const score = (side: 'home' | 'away') =>
    results[m.def.id]?.sets.map((s) => s[side]).join(' ') ?? '';

  const editable = Boolean(onEdit);
  const lines = (
    <>
      <TeamLine label={homeLabel} seed={seedOf(m.def.home)} score={score('home')} won={out.winner === 'home'} />
      <div className="mx-3 h-px bg-paper/10" />
      <TeamLine label={awayLabel} seed={seedOf(m.def.away)} score={score('away')} won={out.winner === 'away'} />
    </>
  );

  // ── Finale (climax card) ────────────────────────────────────────────────
  if (variant === 'final') {
    return (
      <div className={`rounded-2xl bg-court-soft p-1 ${out.complete ? 'ko-champion-glow' : 'border border-accent/40'}`}>
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
      <div className="rounded-2xl border border-paper/10 bg-court-soft/40">
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
    <div className="ko-match rounded-2xl border border-paper/15 bg-court-soft/70 backdrop-blur-sm">
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
  score,
  won,
}: {
  label: string;
  seed: number | null;
  score: string;
  won: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 rounded-xl px-3 py-2 ${won ? 'bg-accent/20' : ''}`}>
      {seed != null && (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-paper/10 font-display text-[0.65rem] font-bold text-paper/70">
          {seed}
        </span>
      )}
      <span className={`min-w-0 flex-1 truncate ${won ? 'font-bold text-paper' : 'text-paper/75'}`}>{label}</span>
      <span className={`font-display text-lg font-bold tabular-nums ${won ? 'text-accent' : 'text-paper/50'}`}>
        {score}
      </span>
    </div>
  );
}
