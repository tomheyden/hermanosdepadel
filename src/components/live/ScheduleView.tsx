import type { MatchResult, Scenario, SlotId, Team } from '../../types';
import { teamName } from '../../lib/display';
import MatchRow from './MatchRow';

interface Props {
  scenario: Scenario;
  teams: Record<SlotId, Team>;
  results: Record<string, MatchResult>;
  onSave: (r: MatchResult) => void;
  onClear: (matchId: string) => void;
}

export default function ScheduleView({ scenario, teams, results, onSave, onClear }: Props) {
  // Group the chronological plan by time slot for clear "what's on now" reading.
  const byTime = new Map<string, typeof scenario.groupSchedule>();
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
        {[...byTime.entries()].map(([time, matches]) => (
          <section key={time}>
            <div className="mb-3 flex items-center gap-3">
              <span className="font-display text-xl font-bold text-court">{time}</span>
              <span className="h-px flex-1 bg-ink/10" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {matches
                .sort((a, b) => a.court - b.court)
                .map((m) => {
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
        ))}
      </div>
    </div>
  );
}
