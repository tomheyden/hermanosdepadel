import type { MatchResult, Scenario, SetScore, SlotId, Team } from '../../types';
import { teamName } from '../../lib/display';
import { remainingSeconds, formatMMSS } from '../../lib/liveStatus';
import { activeGroupMatches } from '../../lib/activeGames';
import { useTicker } from '../../hooks/useTicker';

interface Props {
  scenario: Scenario;
  teams: Record<SlotId, Team>;
  results: Record<string, MatchResult>;
  startedAt: Record<string, number>;
  liveScores: Record<string, SetScore>;
}

export default function ActiveGamesView({ scenario, teams, results, startedAt, liveScores }: Props) {
  const now = useTicker();
  const active = activeGroupMatches(scenario, startedAt, results);

  return (
    <section>
      <h2 className="mb-6 font-display text-3xl font-bold uppercase tracking-wide text-accent">
        Aktives Spiel
      </h2>

      {active.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-paper/20 px-6 py-20 text-center">
          <p className="text-xl font-semibold">Gerade kein Spiel aktiv</p>
          <p className="mt-2 text-paper/60">Sobald ein Spiel startet, erscheint es hier live.</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {active.map((m) => {
            const started = startedAt[m.id];
            const remaining = started
              ? remainingSeconds(started, scenario.groupMatchDurationMin, now)
              : 0;
            const over = remaining <= 0;
            const score = liveScores[m.id] ?? { home: 0, away: 0 };
            const group = scenario.groups.find((g) => g.id === m.group);
            return (
              <div key={m.id} className="overflow-hidden rounded-3xl border border-accent bg-court-soft ko-champion-glow">
                <div className="flex items-center justify-between bg-black/20 px-6 py-3">
                  <span className="font-display text-lg font-bold uppercase tracking-wide">
                    Platz {m.court} · {group?.label}
                  </span>
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 font-display text-sm font-bold uppercase tracking-wide tabular-nums ${
                      over ? 'bg-red-500 text-white' : 'bg-accent text-accent-ink'
                    }`}
                  >
                    <span className="relative flex h-2 w-2">
                      {!over && (
                        <span className="absolute inline-flex h-full w-full rounded-full bg-accent-ink/60 motion-safe:animate-ping" />
                      )}
                      <span className={`relative inline-flex h-2 w-2 rounded-full ${over ? 'bg-white' : 'bg-accent-ink'}`} />
                    </span>
                    {over ? 'Zeit abgelaufen' : formatMMSS(remaining)}
                  </span>
                </div>
                <div className="divide-y divide-paper/10">
                  <TeamScore name={teamName(teams, m.home)} value={score.home} lead={score.home > score.away} />
                  <TeamScore name={teamName(teams, m.away)} value={score.away} lead={score.away > score.home} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function TeamScore({ name, value, lead }: { name: string; value: number; lead: boolean }) {
  return (
    <div className={`flex items-center justify-between px-6 py-6 ${lead ? 'bg-accent/10' : ''}`}>
      <span className={`min-w-0 flex-1 truncate text-2xl ${lead ? 'font-bold text-paper' : 'text-paper/80'}`}>
        {name}
      </span>
      <span className={`font-display text-6xl font-bold tabular-nums ${lead ? 'text-accent' : 'text-paper/70'}`}>
        {value}
      </span>
    </div>
  );
}
