import type { MatchResult, Scenario, SlotId, Team } from '../../types';
import { computeAllStandings } from '../../lib/standings';
import { computeQualification } from '../../lib/qualification';
import { teamName } from '../../lib/display';

interface Props {
  scenario: Scenario;
  teams: Record<SlotId, Team>;
  results: Record<string, MatchResult>;
}

export default function GroupStandings({ scenario, teams, results }: Props) {
  const standings = computeAllStandings(scenario, teams, results);
  const qualification = computeQualification(scenario, teams, results);
  const qualified = new Set(qualification.seeds);

  return (
    <div>
      <div className="mb-6 flex items-baseline justify-between">
        <h2 className="text-3xl font-bold uppercase">Gruppen-Tabellen</h2>
        <span className="font-display text-sm font-semibold uppercase tracking-wide text-muted">
          Sortierung: Siege · Diff · Punkte
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {scenario.groups.map((group) => (
          <div key={group.id} className="overflow-hidden rounded-2xl border border-ink/10 bg-white">
            <div className="flex items-center justify-between bg-court px-5 py-3">
              <h3 className="font-display text-lg font-bold uppercase tracking-wide text-paper">
                {group.label}
              </h3>
              <span className="font-display text-xs uppercase tracking-wide text-accent">
                {group.slots.length} Teams
              </span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-left font-display text-xs uppercase tracking-wide text-muted">
                  <th className="px-3 py-2 font-semibold">#</th>
                  <th className="px-2 py-2 font-semibold">Team</th>
                  <th className="px-2 py-2 text-center font-semibold" title="Spiele">Sp</th>
                  <th className="px-2 py-2 text-center font-semibold" title="Siege">S</th>
                  <th className="px-2 py-2 text-center font-semibold" title="Differenz">Diff</th>
                  <th className="px-3 py-2 text-center font-semibold" title="Erzielte Punkte">Pkt</th>
                </tr>
              </thead>
              <tbody>
                {standings[group.id].map((s) => {
                  const isQ = qualified.has(s.teamId);
                  return (
                    <tr
                      key={s.teamId}
                      className={`border-b border-ink/5 last:border-0 ${isQ ? 'bg-accent/15' : ''}`}
                    >
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full font-display text-xs font-bold ${
                            isQ ? 'bg-accent text-accent-ink' : 'bg-ink/5 text-muted'
                          }`}
                        >
                          {s.rank}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 font-medium">{teamName(teams, s.teamId)}</td>
                      <td className="px-2 py-2.5 text-center tabular-nums text-muted">{s.played}</td>
                      <td className="px-2 py-2.5 text-center font-bold tabular-nums">{s.won}</td>
                      <td className="px-2 py-2.5 text-center tabular-nums text-muted">
                        {s.diff > 0 ? `+${s.diff}` : s.diff}
                      </td>
                      <td className="px-3 py-2.5 text-center font-semibold tabular-nums">{s.pointsFor}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <p className="mt-5 flex items-center gap-2 text-sm text-muted">
        <span className="inline-block h-3 w-3 rounded-full bg-accent" />
        Hervorgehoben = aktuell für die KO-Phase qualifiziert
        {!qualification.complete && ' (vorläufig — Gruppenphase noch nicht abgeschlossen)'}
      </p>
    </div>
  );
}
