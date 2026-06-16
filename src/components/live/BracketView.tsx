import { useState } from 'react';
import type { MatchResult, Scenario, SetScore, SlotId, SlotRef, Team } from '../../types';
import { computeQualification, eliminatedLabel, seedLabel } from '../../lib/qualification';
import { everyTeamHasPlayed } from '../../lib/standings';
import { resolveBracket, computeFinalStandings } from '../../lib/bracket';
import { teamName } from '../../lib/display';
import { TrophyIcon } from '../icons';
import Bracket from './Bracket';
import ResultEditor from './ResultEditor';

interface Props {
  scenario: Scenario;
  teams: Record<SlotId, Team>;
  results: Record<string, MatchResult>;
  startedAt?: Record<string, number>;
  liveScores?: Record<string, SetScore>;
  liveSets?: Record<string, SetScore[]>;
  onSave: (r: MatchResult) => void;
  onClear: (matchId: string) => void;
}

export default function BracketView({
  scenario,
  teams,
  results,
  startedAt = {},
  liveScores = {},
  liveSets = {},
  onSave,
  onClear,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const qualification = computeQualification(scenario, teams, results);
  // Show a (provisional) KO preview as soon as every team has played once, so
  // teams can see their likely opponent and prepare; the seeding only becomes
  // final once the whole group phase is decided. Before the first round is
  // complete the slots stay as "Setzplatz 1" etc.
  const preview = everyTeamHasPlayed(scenario, teams, results);
  const eliminated = preview ? qualification.eliminated : [];
  const bracket = resolveBracket(scenario, preview ? qualification.seeds : [], results, eliminated);
  const places = computeFinalStandings(bracket);
  const champion = places?.find((p) => p.place === 1);

  const editing = editingId ? bracket.find((m) => m.def.id === editingId) : null;
  const describe = (ref: SlotRef): string => {
    if (ref.type === 'seed') return seedLabel(scenario, ref.seed);
    if (ref.type === 'eliminated') return eliminatedLabel(ref.rank, eliminated.length || 4);
    const src = scenario.koSchedule.find((m) => m.id === ref.matchId);
    return `${ref.type === 'winner' ? 'Sieger' : 'Verlierer'} ${src?.label ?? ''}`.trim();
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-3xl font-bold uppercase">KO-Baum</h2>
        <span className="font-display text-sm font-semibold uppercase tracking-wide text-muted">
          {scenario.koSummary}
        </span>
      </div>

      {/* Dark arena */}
      <div className="relative overflow-hidden rounded-3xl bg-court p-6 text-paper md:p-10">
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

          <Bracket
            scenario={scenario}
            teams={teams}
            results={results}
            bracket={bracket}
            eliminated={eliminated}
            startedAt={startedAt}
            liveScores={liveScores}
            liveSets={liveSets}
            onEdit={setEditingId}
          />
        </div>
      </div>

      {editing && (
        <EditModal onClose={() => setEditingId(null)}>
          <ResultEditor
            matchId={editing.def.id}
            format={editing.def.format}
            homeLabel={editing.homeTeam ? teamName(teams, editing.homeTeam) : describe(editing.def.home)}
            awayLabel={editing.awayTeam ? teamName(teams, editing.awayTeam) : describe(editing.def.away)}
            current={results[editing.def.id]}
            onSave={onSave}
            onClear={() => onClear(editing.def.id)}
            onClose={() => setEditingId(null)}
          />
        </EditModal>
      )}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-paper p-5 text-ink shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
