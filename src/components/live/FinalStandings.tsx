import type { MatchResult, Scenario, SlotId, Team } from '../../types';
import { computeQualification } from '../../lib/qualification';
import { resolveBracket, computeFinalStandings, computeBonusStandings } from '../../lib/bracket';
import { teamName } from '../../lib/display';
import { TrophyIcon } from '../icons';

interface Props {
  scenario: Scenario;
  teams: Record<SlotId, Team>;
  results: Record<string, MatchResult>;
}

const PLACE_STYLES: Record<number, string> = {
  1: 'bg-accent text-accent-ink',
  2: 'bg-court text-paper',
  3: 'bg-court/70 text-paper',
  4: 'bg-ink/5 text-ink',
};
const PLACE_LABEL: Record<number, string> = { 1: 'Sieger', 2: 'Finalist', 3: 'Platz 3', 4: 'Platz 4' };

export default function FinalStandings({ scenario, teams, results }: Props) {
  const qualification = computeQualification(scenario, teams, results);
  const bracket = resolveBracket(scenario, qualification.seeds, results, qualification.eliminated);
  const places = computeFinalStandings(bracket);
  const bonus = computeBonusStandings(bracket, qualification.eliminated);

  return (
    <div>
      <h2 className="mb-6 text-3xl font-bold uppercase">Endstand</h2>

      {!places ? (
        <div className="rounded-2xl border border-dashed border-ink/20 bg-white px-6 py-16 text-center">
          <TrophyIcon className="mx-auto h-10 w-10 text-muted" />
          <p className="mt-4 text-lg font-semibold">Noch nicht entschieden</p>
          <p className="mt-1 text-muted">
            Der Endstand erscheint, sobald Finale und Spiel um Platz 3 eingetragen sind.
          </p>
        </div>
      ) : (
        <ol className="space-y-3">
          {places.map((p) => (
            <li
              key={p.place}
              className={`flex items-center gap-4 rounded-2xl px-6 py-5 ${PLACE_STYLES[p.place]}`}
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-black/10 font-display text-2xl font-bold">
                {p.place}
              </span>
              <div className="min-w-0">
                <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] opacity-80">
                  {PLACE_LABEL[p.place]}
                </p>
                <p className="truncate text-2xl font-bold">{teamName(teams, p.teamId)}</p>
              </div>
              {p.place === 1 && <TrophyIcon className="ml-auto h-8 w-8" />}
            </li>
          ))}
        </ol>
      )}

      {bonus?.worstTeamId && (
        <div className="mt-6 flex items-center gap-4 rounded-2xl border border-ink/15 bg-white px-6 py-5">
          <TrophyIcon className="h-8 w-8 shrink-0 text-muted" />
          <div className="min-w-0">
            <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              Worst Team of the Tournament
            </p>
            <p className="truncate text-2xl font-bold">{teamName(teams, bonus.worstTeamId)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
