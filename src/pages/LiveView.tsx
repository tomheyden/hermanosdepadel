import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePublishedTournament } from '../hooks/useTournament';
import { computeAllStandings } from '../lib/standings';
import { computeQualification } from '../lib/qualification';
import { resolveBracket, computeFinalStandings, computeBonusStandings } from '../lib/bracket';
import { teamName } from '../lib/display';
import type { MatchResult, Scenario, SetScore, SlotId, Team } from '../types';
import { TrophyIcon } from '../components/icons';
import { Countdown, useCountdown, formatTournamentDate } from '../components/Countdown';
import Bracket from '../components/live/Bracket';
import AllMatches from '../components/live/AllMatches';
import ActiveGamesView from '../components/live/ActiveGamesView';
import Rules from '../components/live/Rules';

type Tab = 'active' | 'schedule' | 'groups' | 'bracket' | 'rules';
const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'active', label: 'Aktives Spiel' },
  { id: 'schedule', label: 'Alle Spiele' },
  { id: 'groups', label: 'Gruppenübersicht' },
  { id: 'bracket', label: 'KO Phase' },
  { id: 'rules', label: 'Spielregeln' },
];

/**
 * Read-only "beamer" view (no password). Mirrors the live standings, KO bracket
 * and final result, and updates automatically: useTournament subscribes to the
 * storage abstraction, so edits made on /live in another tab push here live.
 */
export default function LiveView() {
  const { tournament, loaded, scenario, phase } = usePublishedTournament();
  const countdown = useCountdown(tournament?.tournamentDate);

  if (!loaded) {
    return <Centered>Lädt…</Centered>;
  }

  // Nothing published, or still a draft → a teaser with the countdown.
  if (!tournament || !scenario || phase === 'setup' || phase === 'ready') {
    return <WaitingScreen target={tournament?.tournamentDate} countdown={countdown} />;
  }

  // Published (preview) or live → the full board. `phase` switches the chrome.
  return (
    <Beamer
      phase={phase}
      tournamentDate={tournament.tournamentDate}
      state={{
        teams: tournament.teams,
        results: tournament.results,
        startedAt: tournament.startedAt ?? {},
        liveScores: tournament.liveScores ?? {},
        liveSets: tournament.liveSets ?? {},
      }}
      scenario={scenario}
    />
  );
}

function WaitingScreen({
  target,
  countdown,
}: {
  target?: string;
  countdown: ReturnType<typeof useCountdown>;
}) {
  const dateLabel = formatTournamentDate(target);
  return (
    <Centered>
      <img src="/logo.svg" alt="" aria-hidden="true" className="mb-6 h-20 w-20" />
      <h1 className="font-display text-4xl font-bold uppercase md:text-5xl">Hermanos de Padel</h1>

      {countdown ? (
        <>
          <p className="mt-4 font-display text-sm uppercase tracking-[0.25em] text-accent">
            {countdown.done ? 'Es geht gleich los' : 'Noch'}
          </p>
          <div className="mt-6">
            <Countdown parts={countdown} />
          </div>
          {dateLabel && <p className="mt-6 text-paper/70">{dateLabel}</p>}
        </>
      ) : (
        <p className="mt-3 text-paper/70">Das Turnier startet in Kürze.</p>
      )}

      <div className="mt-8 flex items-center gap-4 text-sm">
        <Link to="/" className="text-paper/70 hover:text-paper">
          Zur Startseite
        </Link>
        <span className="text-paper/30">·</span>
        <Link to="/admin" className="text-accent hover:underline">
          Zum Admin-Bereich
        </Link>
      </div>
    </Centered>
  );
}

function Beamer({
  phase,
  tournamentDate,
  state,
  scenario,
}: {
  phase: 'published' | 'live';
  tournamentDate?: string;
  state: {
    teams: Record<SlotId, Team>;
    results: Record<string, MatchResult>;
    startedAt: Record<string, number>;
    liveScores: Record<string, SetScore>;
    liveSets: Record<string, SetScore[]>;
  };
  scenario: Scenario;
}) {
  const { teams, results, startedAt, liveScores, liveSets } = state;
  const preview = phase === 'published';
  const visibleTabs = preview ? TABS.filter((t) => t.id !== 'active') : TABS;
  const [tab, setTab] = useState<Tab>(preview ? 'schedule' : 'active');
  const countdown = useCountdown(tournamentDate);
  const activeTab = visibleTabs.some((t) => t.id === tab) ? tab : visibleTabs[0].id;

  const qualification = computeQualification(scenario, teams, results);
  const eliminated = qualification.complete ? qualification.eliminated : [];
  const bracket = resolveBracket(
    scenario,
    qualification.complete ? qualification.seeds : [],
    results,
    eliminated,
  );
  const places = computeFinalStandings(bracket);
  const worstTeamId = computeBonusStandings(bracket, eliminated)?.worstTeamId ?? null;

  return (
    <div className="min-h-[100svh] bg-court text-paper">
      <header className="sticky top-0 z-20 border-b border-paper/15 bg-court/95 backdrop-blur">
        <div className="mx-auto flex max-w-[100rem] items-center justify-between gap-4 px-6 py-4 md:px-8">
          <div className="flex items-center gap-4">
            <img src="/logo.svg" alt="" aria-hidden="true" className="h-11 w-11" />
            <div>
              <p className="font-display text-xl font-bold uppercase tracking-wide md:text-2xl">
                Hermanos de Padel · {preview ? 'Vorschau' : 'Live'}
              </p>
              <p className="text-sm text-paper/70">
                {scenario.name}
                {preview && formatTournamentDate(tournamentDate) ? ` · Start ${tournamentDate?.split('T')[1]} Uhr` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Link
              to="/"
              className="hidden rounded-full px-3.5 py-1.5 font-display text-sm font-semibold uppercase tracking-wide text-paper/70 transition-colors hover:bg-paper/10 hover:text-paper sm:inline-block"
            >
              Start
            </Link>
            <Link
              to="/admin"
              className="rounded-full border border-paper/25 px-3.5 py-1.5 font-display text-sm font-semibold uppercase tracking-wide text-paper/85 transition-colors hover:border-accent hover:text-accent"
            >
              Admin
            </Link>
          </div>
        </div>

        {/* tabs */}
        <nav className="mx-auto flex max-w-[100rem] gap-1 overflow-x-auto px-6 pb-2 md:px-8">
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 font-display text-sm font-semibold uppercase tracking-wide transition-colors cursor-pointer ${
                activeTab === t.id ? 'bg-accent text-accent-ink' : 'text-paper/75 hover:bg-paper/10 hover:text-paper'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="mx-auto max-w-[100rem] space-y-10 px-6 py-8 md:px-8 md:py-10">
        {preview && countdown && (
          <section className="rounded-3xl bg-court-soft px-6 py-10 text-center">
            <p className="font-display text-sm font-semibold uppercase tracking-[0.25em] text-accent">
              {countdown.done ? 'Es geht gleich los' : 'Erstes Spiel in'}
            </p>
            <div className="mt-5 flex justify-center">
              <Countdown parts={countdown} />
            </div>
            {formatTournamentDate(tournamentDate) && (
              <p className="mt-6 text-paper/70">{formatTournamentDate(tournamentDate)}</p>
            )}
          </section>
        )}

        {places && <Podium places={places} teams={teams} worstTeamId={worstTeamId} />}

        {activeTab === 'active' && (
          <ActiveGamesView
            scenario={scenario}
            tournamentDate={tournamentDate}
            teams={teams}
            results={results}
            startedAt={startedAt}
            liveScores={liveScores}
            liveSets={liveSets}
          />
        )}

        {activeTab === 'schedule' && (
          <AllMatches
            scenario={scenario}
            teams={teams}
            results={results}
            bracket={bracket}
            startedAt={startedAt}
            liveScores={liveScores}
          />
        )}

        {activeTab === 'groups' && <GroupsGrid scenario={scenario} teams={teams} results={results} />}

        {activeTab === 'bracket' && (
          <section>
            <h2 className="mb-6 font-display text-3xl font-bold uppercase tracking-wide text-accent">
              KO-Baum
            </h2>
            <Bracket
              scenario={scenario}
              teams={teams}
              results={results}
              bracket={bracket}
              eliminated={eliminated}
              startedAt={startedAt}
              liveScores={liveScores}
              liveSets={liveSets}
            />
          </section>
        )}

        {activeTab === 'rules' && <Rules scenario={scenario} variant="dark" />}
      </div>
    </div>
  );
}

/** "Spieler 1 · Spieler 2" for a team, or '' when no players are entered. */
function playersLabel(team?: Team): string {
  if (!team) return '';
  return [team.player1, team.player2].map((p) => p?.trim()).filter(Boolean).join(' · ');
}

function GroupsGrid({
  scenario,
  teams,
  results,
}: {
  scenario: Scenario;
  teams: Record<SlotId, Team>;
  results: Record<string, MatchResult>;
}) {
  const standings = computeAllStandings(scenario, teams, results);
  const qualified = new Set(computeQualification(scenario, teams, results).seeds);

  return (
    <section>
      <h2 className="mb-6 font-display text-3xl font-bold uppercase tracking-wide text-accent">
        Gruppenübersicht
      </h2>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {scenario.groups.map((group) => (
          <div key={group.id} className="overflow-hidden rounded-2xl bg-court-soft">
            <div className="bg-black/20 px-5 py-3 font-display text-xl font-bold uppercase tracking-wide">
              {group.label}
            </div>
            <table className="w-full">
              <tbody>
                {standings[group.id].map((s) => {
                  const isQ = qualified.has(s.teamId);
                  return (
                    <tr key={s.teamId} className="border-b border-paper/10 last:border-0">
                      <td className="w-10 py-3 pl-5">
                        <span
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-full font-display text-sm font-bold ${
                            isQ ? 'bg-accent text-accent-ink' : 'bg-paper/10 text-paper/70'
                          }`}
                        >
                          {s.rank}
                        </span>
                      </td>
                      <td className="w-full py-2.5 pl-2 pr-3">
                        <p className="text-lg font-semibold leading-tight [overflow-wrap:anywhere]">
                          {teamName(teams, s.teamId)}
                        </p>
                        {playersLabel(teams[s.teamId]) && (
                          <p className="text-xs leading-tight text-paper/50 [overflow-wrap:anywhere]">
                            {playersLabel(teams[s.teamId])}
                          </p>
                        )}
                      </td>
                      <td className="whitespace-nowrap py-3 pr-4 text-right text-sm text-paper/60">
                        {s.won} S
                      </td>
                      <td className="py-3 pr-5 text-right font-display text-xl font-bold tabular-nums text-accent">
                        {s.pointsFor}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </section>
  );
}

function Podium({
  places,
  teams,
  worstTeamId,
}: {
  places: NonNullable<ReturnType<typeof computeFinalStandings>>;
  teams: Record<SlotId, Team>;
  worstTeamId?: SlotId | null;
}) {
  const style: Record<number, string> = {
    1: 'bg-accent text-accent-ink',
    2: 'bg-paper/15',
    3: 'bg-paper/10',
    4: 'bg-paper/5',
  };
  return (
    <section className="rounded-3xl bg-court-soft p-8">
      <h2 className="mb-6 flex items-center gap-3 font-display text-3xl font-bold uppercase tracking-wide">
        <TrophyIcon className="h-8 w-8 text-accent" /> Endstand
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {places.map((p) => (
          <div key={p.place} className={`rounded-2xl px-6 py-6 ${style[p.place]}`}>
            <span className="font-display text-5xl font-bold">{p.place}</span>
            <p className="mt-2 text-xl font-bold">{teamName(teams, p.teamId)}</p>
          </div>
        ))}
      </div>
      {worstTeamId && (
        <div className="mt-4 flex items-center gap-4 rounded-2xl border border-paper/15 px-6 py-5">
          <TrophyIcon className="h-7 w-7 shrink-0 text-paper/55" />
          <div className="min-w-0">
            <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-paper/55">
              Worst Team of the Tournament
            </p>
            <p className="truncate text-xl font-bold">{teamName(teams, worstTeamId)}</p>
          </div>
        </div>
      )}
    </section>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100svh] flex-col items-center justify-center bg-court px-6 text-center text-paper">
      {children}
    </div>
  );
}
