import { useState } from 'react';
import type { KoStage, MatchResult, Scenario, SlotId, SlotRef, Team } from '../../types';
import { computeQualification } from '../../lib/qualification';
import { resolveBracket, computeFinalStandings, type ResolvedKoMatch } from '../../lib/bracket';
import { evaluateMatch } from '../../lib/match';
import { teamName } from '../../lib/display';
import { TrophyIcon } from '../icons';
import ResultEditor from './ResultEditor';

interface Props {
  scenario: Scenario;
  teams: Record<SlotId, Team>;
  results: Record<string, MatchResult>;
  onSave: (r: MatchResult) => void;
  onClear: (matchId: string) => void;
}

const STAGE_TITLES: Record<KoStage, string> = {
  QF: 'Viertelfinale',
  SF: 'Halbfinale',
  F: 'Finale',
  P3: 'Spiel um Platz 3',
};

export default function BracketView({ scenario, teams, results, onSave, onClear }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const qualification = computeQualification(scenario, teams, results);
  const bracket = resolveBracket(scenario, qualification.seeds, results);
  const places = computeFinalStandings(bracket);
  const champion = places?.find((p) => p.place === 1);

  const byStage = (s: KoStage) => bracket.filter((m) => m.def.stage === s);
  const qf = byStage('QF');
  const sf = byStage('SF');
  const final = byStage('F')[0];
  const p3 = byStage('P3')[0];

  // Rounds laid left→right; the last one (final) carries no outgoing connectors.
  const rounds = [qf.length ? qf : null, sf, [final]].filter(Boolean) as ResolvedKoMatch[][];

  const describe = (ref: SlotRef): string => {
    if (ref.type === 'seed') return `Qualifikant ${ref.seed}`;
    const src = scenario.koSchedule.find((m) => m.id === ref.matchId);
    return `${ref.type === 'winner' ? 'Sieger' : 'Verlierer'} ${src?.label ?? ''}`.trim();
  };

  const editing = editingId ? bracket.find((m) => m.def.id === editingId) : null;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-3xl font-bold uppercase">KO-Baum</h2>
        <span className="font-display text-sm font-semibold uppercase tracking-wide text-muted">
          {scenario.koSummary}
        </span>
      </div>

      {/* ── Dark arena ──────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-court p-6 text-paper md:p-10">
        {/* faint court texture */}
        <img
          src="/court-aerial.jpg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.07]"
        />
        <div className="relative">
          {champion ? (
            <ChampionBanner name={teamName(teams, champion.teamId)} />
          ) : (
            !qualification.complete && (
              <p className="mb-8 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-paper/90">
                Setzung <strong>vorläufig</strong> — wird endgültig, sobald alle
                Gruppenspiele eingetragen sind. Sieger rücken automatisch vor.
              </p>
            )
          )}

          <div className="flex flex-col gap-10 lg:flex-row lg:items-stretch lg:gap-12">
            {rounds.map((round, ri) => {
              const isFinalCol = ri === rounds.length - 1;
              return (
                <div key={ri} className="flex flex-1 flex-col">
                  <RoundHeader title={isFinalCol ? 'Finale' : STAGE_TITLES[round[0].def.stage]} />
                  {isFinalCol ? (
                    <div className="flex flex-1 flex-col justify-around gap-8">
                      <FinalCard
                        m={final}
                        teams={teams}
                        results={results}
                        describe={describe}
                        onEdit={() => setEditingId(final.def.id)}
                      />
                      {p3 && (
                        <ThirdPlaceCard
                          m={p3}
                          teams={teams}
                          results={results}
                          describe={describe}
                          onEdit={() => setEditingId(p3.def.id)}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-1 flex-col justify-around gap-8">
                      {chunkPairs(round).map((pair, pi) => (
                        <div key={pi} className="ko-pair has-next flex flex-col justify-around gap-8">
                          {pair.map((m) => (
                            <MatchCard
                              key={m.def.id}
                              m={m}
                              teams={teams}
                              results={results}
                              describe={describe}
                              onEdit={() => setEditingId(m.def.id)}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Edit modal ──────────────────────────────────────────────────── */}
      {editing && (
        <EditModal onClose={() => setEditingId(null)}>
          <ResultEditor
            matchId={editing.def.id}
            format={editing.def.format}
            homeLabel={editing.homeTeam ? teamName(teams, editing.homeTeam) : describe(editing.def.home)}
            awayLabel={editing.awayTeam ? teamName(teams, editing.awayTeam) : describe(editing.def.away)}
            current={results[editing.def.id]}
            onSave={(r) => onSave(r)}
            onClear={() => onClear(editing.def.id)}
            onClose={() => setEditingId(null)}
          />
        </EditModal>
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

interface CardProps {
  m: ResolvedKoMatch;
  teams: Record<SlotId, Team>;
  results: Record<string, MatchResult>;
  describe: (ref: SlotRef) => string;
  onEdit: () => void;
}

function seedOf(ref: SlotRef): number | null {
  return ref.type === 'seed' ? ref.seed : null;
}

function MatchCard({ m, teams, results, describe, onEdit }: CardProps) {
  const out = evaluateMatch(results[m.def.id], m.def.format);
  const ready = Boolean(m.homeTeam && m.awayTeam);
  const homeLabel = m.homeTeam ? teamName(teams, m.homeTeam) : describe(m.def.home);
  const awayLabel = m.awayTeam ? teamName(teams, m.awayTeam) : describe(m.def.away);
  const score = (side: 'home' | 'away') =>
    results[m.def.id]?.sets.map((s) => s[side]).join(' ') ?? '';

  return (
    <div className="ko-match rounded-2xl border border-paper/15 bg-court-soft/70 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 pt-3 text-xs">
        <span className="font-display uppercase tracking-wide text-paper/60">{m.def.label}</span>
        <span className="font-display tracking-wide text-paper/45">
          {m.def.time} · P{m.def.court}
        </span>
      </div>
      <div className="px-2 py-2">
        <TeamLine label={homeLabel} seed={seedOf(m.def.home)} score={score('home')} won={out.winner === 'home'} />
        <div className="mx-3 h-px bg-paper/10" />
        <TeamLine label={awayLabel} seed={seedOf(m.def.away)} score={score('away')} won={out.winner === 'away'} />
      </div>
      <div className="px-4 pb-3">
        {ready ? (
          <button
            onClick={onEdit}
            className="w-full rounded-full border border-accent/50 px-3 py-1.5 font-display text-xs font-semibold uppercase tracking-wide text-accent transition-colors hover:bg-accent hover:text-accent-ink cursor-pointer"
          >
            {results[m.def.id] ? 'Bearbeiten' : 'Ergebnis eintragen'}
          </button>
        ) : (
          <p className="text-center text-xs text-paper/40">wartet auf Teams</p>
        )}
      </div>
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
    <div
      className={`flex items-center gap-2 rounded-xl px-3 py-2 ${won ? 'bg-accent/20' : ''}`}
    >
      {seed != null && (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-paper/10 font-display text-[0.65rem] font-bold text-paper/70">
          {seed}
        </span>
      )}
      <span className={`min-w-0 flex-1 truncate ${won ? 'font-bold text-paper' : 'text-paper/75'}`}>
        {label}
      </span>
      <span className={`font-display text-lg font-bold tabular-nums ${won ? 'text-accent' : 'text-paper/50'}`}>
        {score}
      </span>
    </div>
  );
}

function FinalCard({ m, teams, results, describe, onEdit }: CardProps) {
  const out = evaluateMatch(results[m.def.id], m.def.format);
  const ready = Boolean(m.homeTeam && m.awayTeam);
  const homeLabel = m.homeTeam ? teamName(teams, m.homeTeam) : describe(m.def.home);
  const awayLabel = m.awayTeam ? teamName(teams, m.awayTeam) : describe(m.def.away);
  const score = (side: 'home' | 'away') =>
    results[m.def.id]?.sets.map((s) => s[side]).join(' ') ?? '';
  const decided = out.complete;

  return (
    <div className={`rounded-2xl bg-court-soft p-1 ${decided ? 'ko-champion-glow' : 'border border-accent/40'}`}>
      <div className="rounded-xl bg-court/60 px-2 py-3">
        <div className="mb-2 flex items-center justify-center gap-2">
          <TrophyIcon className="h-5 w-5 text-accent" />
          <span className="font-display text-sm font-bold uppercase tracking-[0.2em] text-accent">
            Finale
          </span>
          <span className="font-display text-xs text-paper/45">· {m.def.time}</span>
        </div>
        <TeamLine label={homeLabel} seed={seedOf(m.def.home)} score={score('home')} won={out.winner === 'home'} />
        <div className="mx-3 my-0.5 h-px bg-paper/10" />
        <TeamLine label={awayLabel} seed={seedOf(m.def.away)} score={score('away')} won={out.winner === 'away'} />
        <div className="px-2 pt-3">
          {ready ? (
            <button
              onClick={onEdit}
              className="w-full rounded-full bg-accent px-3 py-2 font-display text-sm font-bold uppercase tracking-wide text-accent-ink transition-transform hover:-translate-y-0.5 cursor-pointer"
            >
              {results[m.def.id] ? 'Finale bearbeiten' : 'Finale eintragen'}
            </button>
          ) : (
            <p className="text-center text-xs text-paper/40">wartet auf die Halbfinal-Sieger</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ThirdPlaceCard({ m, teams, results, describe, onEdit }: CardProps) {
  const out = evaluateMatch(results[m.def.id], m.def.format);
  const ready = Boolean(m.homeTeam && m.awayTeam);
  const homeLabel = m.homeTeam ? teamName(teams, m.homeTeam) : describe(m.def.home);
  const awayLabel = m.awayTeam ? teamName(teams, m.awayTeam) : describe(m.def.away);
  const score = (side: 'home' | 'away') =>
    results[m.def.id]?.sets.map((s) => s[side]).join(' ') ?? '';

  return (
    <div className="rounded-2xl border border-paper/10 bg-court-soft/40">
      <div className="px-4 pt-3 text-center font-display text-xs font-semibold uppercase tracking-[0.18em] text-paper/55">
        Spiel um Platz 3 · {m.def.time}
      </div>
      <div className="px-2 py-2">
        <TeamLine label={homeLabel} seed={seedOf(m.def.home)} score={score('home')} won={out.winner === 'home'} />
        <div className="mx-3 h-px bg-paper/10" />
        <TeamLine label={awayLabel} seed={seedOf(m.def.away)} score={score('away')} won={out.winner === 'away'} />
      </div>
      <div className="px-4 pb-3">
        {ready ? (
          <button
            onClick={onEdit}
            className="w-full rounded-full border border-paper/25 px-3 py-1.5 font-display text-xs font-semibold uppercase tracking-wide text-paper/80 transition-colors hover:border-accent hover:text-accent cursor-pointer"
          >
            {results[m.def.id] ? 'Bearbeiten' : 'Ergebnis eintragen'}
          </button>
        ) : (
          <p className="text-center text-xs text-paper/40">wartet auf die Verlierer der Halbfinals</p>
        )}
      </div>
    </div>
  );
}

function ChampionBanner({ name }: { name: string }) {
  return (
    <div className="mb-8 flex items-center gap-5 rounded-2xl bg-accent px-6 py-5 text-accent-ink">
      <TrophyIcon className="h-10 w-10 shrink-0" />
      <div>
        <p className="font-display text-sm font-bold uppercase tracking-[0.25em]">Champion</p>
        <p className="font-display text-3xl font-bold uppercase leading-tight md:text-4xl">{name}</p>
      </div>
    </div>
  );
}

function EditModal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-paper p-5 text-ink shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
