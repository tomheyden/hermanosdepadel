import type { MatchResult, Scenario, SetScore, SlotId, Team } from '../../types';
import { teamName } from '../../lib/display';
import { remainingSeconds, formatMMSS } from '../../lib/liveStatus';
import { activeGroupMatches } from '../../lib/activeGames';
import { slotTimeline, nextActionSlot, formatRemaining } from '../../lib/timeline';
import { resolveBracket, type ResolvedKoMatch } from '../../lib/bracket';
import { computeQualification } from '../../lib/qualification';
import { activeKoMatches, nextKoSlot } from '../../lib/koLive';
import { setWinsOf, koWinner, isGoldenPoint, isTieBreakSet, pointLabel } from '../../lib/tennis';
import { useTicker } from '../../hooks/useTicker';
import SetScoreboard from './SetScoreboard';

interface Props {
  scenario: Scenario;
  tournamentDate?: string;
  teams: Record<SlotId, Team>;
  results: Record<string, MatchResult>;
  startedAt: Record<string, number>;
  liveScores: Record<string, SetScore>;
  liveSets: Record<string, SetScore[]>;
  liveGame: Record<string, SetScore>;
}

export default function ActiveGamesView({
  scenario,
  tournamentDate,
  teams,
  results,
  startedAt,
  liveScores,
  liveSets,
  liveGame,
}: Props) {
  const now = useTicker();
  const active = activeGroupMatches(scenario, startedAt, results);
  const next = nextActionSlot(slotTimeline(scenario, tournamentDate, startedAt, results, now));

  // KO live (after the group phase): resolve the bracket and surface KO matches.
  const qualification = computeQualification(scenario, teams, results);
  const bracket = resolveBracket(
    scenario,
    qualification.complete ? qualification.seeds : [],
    results,
    qualification.complete ? qualification.eliminated : [],
  );
  const koActive = activeKoMatches(bracket, startedAt, results);
  const koNextSlot = nextKoSlot(bracket, startedAt, results);

  // Once the group phase is over, the KO flow owns this tab.
  if (active.length === 0 && qualification.complete) {
    return (
      <section>
        <h2 className="mb-6 font-display text-3xl font-bold uppercase tracking-wide text-accent">
          Aktives Spiel
        </h2>
        {koActive.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-2">
            {koActive.map((m) => (
              <KoLiveCard
                key={m.def.id}
                m={m}
                teams={teams}
                liveSets={liveSets[m.def.id]}
                liveScore={liveScores[m.def.id]}
                liveGame={liveGame[m.def.id]}
              />
            ))}
          </div>
        ) : (
          <KoNext matches={koNextSlot} teams={teams} />
        )}
      </section>
    );
  }

  return (
    <section>
      <h2 className="mb-6 font-display text-3xl font-bold uppercase tracking-wide text-accent">
        Aktives Spiel
      </h2>

      {active.length === 0 ? (
        <NextUp next={next} teams={teams} now={now} />
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

function NextUp({
  next,
  teams,
  now,
}: {
  next: ReturnType<typeof nextActionSlot>;
  teams: Record<SlotId, Team>;
  now: number;
}) {
  if (!next) {
    return (
      <div className="rounded-3xl border border-dashed border-paper/20 px-6 py-20 text-center">
        <p className="text-xl font-semibold">Gerade kein Spiel aktiv</p>
        <p className="mt-2 text-paper/60">Sobald ein Spiel startet, erscheint es hier live.</p>
      </div>
    );
  }
  const due = next.status === 'due';
  const untilMs = next.epoch != null ? next.epoch - now : null;
  return (
    <div className="rounded-3xl border border-dashed border-paper/25 px-6 py-12 text-center">
      <p className="font-display text-sm font-semibold uppercase tracking-[0.25em] text-paper/60">
        Als Nächstes · {next.time}
      </p>
      {untilMs != null && (
        <p
          className={`mt-3 inline-flex items-center gap-2 rounded-full px-5 py-2 font-display text-lg font-bold uppercase tracking-wide tabular-nums ${
            due ? 'bg-red-500 text-white' : 'bg-accent text-accent-ink'
          }`}
        >
          {due ? <>Gleich · überfällig seit {formatRemaining(-untilMs)}</> : <>in {formatRemaining(untilMs)}</>}
        </p>
      )}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {next.matches.map((m) => (
          <div key={m.id} className="w-full max-w-xs rounded-2xl bg-court-soft p-5 text-center">
            <p className="font-display text-xs uppercase tracking-wide text-paper/50">
              Platz {m.court}
            </p>
            <p className="mt-1 text-lg font-bold">{teamName(teams, m.home)}</p>
            <p className="text-paper/50">vs</p>
            <p className="text-lg font-bold">{teamName(teams, m.away)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function KoLiveCard({
  m,
  teams,
  liveSets,
  liveScore,
  liveGame,
}: {
  m: ResolvedKoMatch;
  teams: Record<SlotId, Team>;
  liveSets?: SetScore[];
  liveScore?: SetScore;
  liveGame?: SetScore;
}) {
  const format = m.def.format;
  const isSets = format.type === 'bestOfSets';
  const home = teamName(teams, m.homeTeam);
  const away = teamName(teams, m.awayTeam);
  const sets = liveSets ?? [{ home: 0, away: 0 }];
  const game = liveGame ?? { home: 0, away: 0 };
  const single = liveScore ?? { home: 0, away: 0 };
  const wins = setWinsOf(sets, format);
  const winner = koWinner(sets, format);
  const inTieBreak = isTieBreakSet(sets, format);
  const golden = !inTieBreak && isGoldenPoint(game);

  return (
    <div className="overflow-hidden rounded-3xl border border-accent bg-court-soft ko-champion-glow">
      <div className="flex items-center justify-between bg-black/20 px-6 py-3">
        <span className="font-display text-lg font-bold uppercase tracking-wide">
          {m.def.label} · Platz {m.def.court}
        </span>
        <span className="rounded-full bg-accent px-3 py-1 font-display text-sm font-bold uppercase tracking-wide text-accent-ink">
          live
        </span>
      </div>
      {isSets ? (
        <div className="p-5">
          <SetScoreboard
            home={home}
            away={away}
            sets={sets}
            homeSetsWon={wins.home}
            awaySetsWon={wins.away}
            activeIndex={sets.length - 1}
            tieBreakIndex={format.tieBreakTarget ? 2 : undefined}
            gamePoints={winner || inTieBreak ? undefined : { home: pointLabel(game.home), away: pointLabel(game.away) }}
            goldenPoint={golden}
            winner={winner}
            variant="dark"
          />
        </div>
      ) : (
        <div className="divide-y divide-paper/10">
          <TeamScore name={home} value={single.home} lead={single.home > single.away} />
          <TeamScore name={away} value={single.away} lead={single.away > single.home} />
        </div>
      )}
    </div>
  );
}

function KoNext({ matches, teams }: { matches: ResolvedKoMatch[]; teams: Record<SlotId, Team> }) {
  if (matches.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-paper/20 px-6 py-20 text-center">
        <p className="text-xl font-semibold">Gerade kein Spiel aktiv</p>
        <p className="mt-2 text-paper/60">Sobald ein KO-Spiel startet, erscheint es hier live.</p>
      </div>
    );
  }
  return (
    <div className="rounded-3xl border border-dashed border-paper/25 px-6 py-10 text-center">
      <p className="font-display text-sm font-semibold uppercase tracking-[0.25em] text-paper/60">
        Als Nächstes · {matches[0].def.time}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-4">
        {matches.map((m) => (
          <div key={m.def.id} className="w-full max-w-xs rounded-2xl bg-court-soft px-5 py-4 text-center">
            <p className="font-display text-xs font-semibold uppercase tracking-wide text-paper/50">
              {m.def.label} · Platz {m.def.court}
            </p>
            <p className="mt-1 text-lg font-bold">{teamName(teams, m.homeTeam)}</p>
            <p className="text-paper/50">vs</p>
            <p className="text-lg font-bold">{teamName(teams, m.awayTeam)}</p>
          </div>
        ))}
      </div>
    </div>
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
