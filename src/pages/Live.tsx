import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAuthState, onAuthChange, signOut } from '../lib/auth';
import { useLibrary } from '../hooks/useTournament';
import { useCountdown, formatTournamentDate } from '../components/Countdown';
import type { TournamentPhase } from '../types';
import PasswordGate from '../components/live/PasswordGate';
import Overview from '../components/live/Overview';
import TeamEditor from '../components/live/TeamEditor';
import ActiveGamesAdmin from '../components/live/ActiveGamesAdmin';
import ScheduleView from '../components/live/ScheduleView';
import GroupStandings from '../components/live/GroupStandings';
import BracketView from '../components/live/BracketView';
import FinalStandings from '../components/live/FinalStandings';

type Tab = 'teams' | 'active' | 'schedule' | 'groups' | 'bracket' | 'final';
const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'teams', label: 'Teams & Gruppen' },
  { id: 'active', label: 'Aktive Spiele' },
  { id: 'schedule', label: 'Spielplan' },
  { id: 'groups', label: 'Gruppen' },
  { id: 'bracket', label: 'KO-Baum' },
  { id: 'final', label: 'Endstand' },
];

export default function Live() {
  const [authed, setAuthed] = useState(false);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>('teams');
  const { loaded, library, active, scenario, phase, actions } = useLibrary();

  useEffect(() => {
    let alive = true;
    getAuthState().then((a) => {
      if (!alive) return;
      setAuthed(a);
      setAuthLoaded(true);
    });
    const unsub = onAuthChange(setAuthed);
    return () => {
      alive = false;
      unsub();
    };
  }, []);

  if (!authLoaded) {
    return <div className="flex min-h-[100svh] items-center justify-center text-muted">Lädt…</div>;
  }
  if (!authed) return <PasswordGate onUnlock={() => setAuthed(true)} />;
  if (!loaded || !library) {
    return <div className="flex min-h-[100svh] items-center justify-center text-muted">Lädt…</div>;
  }

  const handleLogout = async () => {
    await signOut();
    setAuthed(false);
  };

  const inOverview = !active || !scenario;

  return (
    <div className="min-h-[100svh] bg-paper">
      <header className="sticky top-0 z-20 border-b border-ink/10 bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-content items-center justify-between gap-4 px-5 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <img src="/logo.svg" alt="" aria-hidden="true" className="h-9 w-9" />
            <div className="min-w-0 leading-tight">
              <p className="truncate font-display text-base font-bold uppercase tracking-wide">
                {inOverview ? 'Admin · Turniere' : active!.title}
              </p>
              {!inOverview && scenario && <p className="truncate text-xs text-muted">{scenario.name}</p>}
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-1.5">
            {!inOverview && (
              <button
                onClick={actions.backToOverview}
                className="rounded-full px-3.5 py-1.5 font-display text-sm font-semibold uppercase tracking-wide text-muted transition-colors hover:bg-ink/5 hover:text-ink cursor-pointer"
              >
                ← Übersicht
              </button>
            )}
            <Link
              to="/turnier"
              target="_blank"
              className="rounded-full border border-court/30 px-3.5 py-1.5 font-display text-sm font-semibold uppercase tracking-wide text-court transition-colors hover:border-court"
            >
              Turnier-Ansicht
            </Link>
            <button
              onClick={handleLogout}
              className="rounded-full border border-ink/15 px-3.5 py-1.5 font-display text-sm font-semibold uppercase tracking-wide text-muted transition-colors hover:border-ink hover:text-ink cursor-pointer"
            >
              Abmelden
            </button>
          </div>
        </div>

        {!inOverview && (
          <nav className="mx-auto flex max-w-content gap-1 overflow-x-auto px-5 pb-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 font-display text-sm font-semibold uppercase tracking-wide transition-colors cursor-pointer ${
                  tab === t.id ? 'bg-court text-paper' : 'text-muted hover:bg-ink/5 hover:text-ink'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-content px-5 py-8 md:py-10">
        {inOverview ? (
          <Overview
            library={library}
            onCreate={actions.createTournament}
            onSelect={actions.selectTournament}
            onRename={actions.renameTournament}
            onDelete={actions.deleteTournament}
            onDuplicate={actions.duplicateTournament}
            onPublish={actions.publishTournament}
            onUnpublish={actions.unpublishTournament}
          />
        ) : (
          active &&
          scenario && (
            <>
              <PhaseBar
                phase={phase}
                tournamentDate={active.tournamentDate}
                onPublish={() => actions.publishTournament(active.id)}
                onUnpublish={actions.unpublishTournament}
                onGoLive={actions.goLive}
                onEndLive={actions.endLive}
              />

              {tab === 'teams' && (
                <TeamEditor
                  scenario={scenario}
                  teams={active.teams}
                  onUpdateTeam={actions.updateTeam}
                  onSetGroupLabel={actions.setGroupLabel}
                />
              )}
              {tab === 'active' && (
                <ActiveGamesAdmin
                  scenario={scenario}
                  tournamentDate={active.tournamentDate}
                  teams={active.teams}
                  results={active.results}
                  startedAt={active.startedAt ?? {}}
                  liveScores={active.liveScores ?? {}}
                  onStartSlot={actions.startSlot}
                  onClearStart={actions.clearSlotStart}
                  onAdjust={actions.adjustScore}
                  onFinish={actions.finishMatch}
                />
              )}
              {tab === 'schedule' && (
                <ScheduleView
                  scenario={scenario}
                  teams={active.teams}
                  results={active.results}
                  startedAt={active.startedAt ?? {}}
                  onSave={actions.setResult}
                  onClear={actions.clearResult}
                  onStartSlot={actions.startSlot}
                  onClearStart={actions.clearSlotStart}
                />
              )}
              {tab === 'groups' && (
                <GroupStandings scenario={scenario} teams={active.teams} results={active.results} />
              )}
              {tab === 'bracket' && (
                <BracketView
                  scenario={scenario}
                  teams={active.teams}
                  results={active.results}
                  onSave={actions.setResult}
                  onClear={actions.clearResult}
                />
              )}
              {tab === 'final' && (
                <FinalStandings scenario={scenario} teams={active.teams} results={active.results} />
              )}

              <div className="mt-10 border-t border-ink/10 pt-5">
                <button
                  onClick={() => {
                    if (
                      window.confirm(
                        'Alle Ergebnisse & Timer dieses Turniers zurücksetzen? Teams und Format bleiben erhalten.',
                      )
                    )
                      actions.resetResults();
                  }}
                  className="rounded-full border border-ink/15 px-4 py-2 font-display text-sm font-semibold uppercase tracking-wide text-muted transition-colors hover:border-red-400 hover:text-red-600 cursor-pointer"
                >
                  Ergebnisse zurücksetzen
                </button>
              </div>
            </>
          )
        )}
      </main>
    </div>
  );
}

/**
 * Banner above the dashboard, one per lifecycle phase:
 *   • ready     → "Veröffentlichen" (this becomes the one public tournament)
 *   • published → countdown to the first match + "Live schalten"
 *   • live      → running indicator + "Live beenden"
 */
function PhaseBar({
  phase,
  tournamentDate,
  onPublish,
  onUnpublish,
  onGoLive,
  onEndLive,
}: {
  phase: TournamentPhase;
  tournamentDate?: string;
  onPublish: () => void;
  onUnpublish: () => void;
  onGoLive: () => void;
  onEndLive: () => void;
}) {
  const countdown = useCountdown(tournamentDate);
  const dateLabel = formatTournamentDate(tournamentDate);

  const remainingLabel = countdown
    ? countdown.done
      ? 'Erster Aufschlag ist fällig'
      : `Erstes Spiel in ${countdown.days > 0 ? `${countdown.days}T ` : ''}${pad(
          countdown.hours,
        )}:${pad(countdown.minutes)}:${pad(countdown.seconds)}`
    : '';

  if (phase === 'live') {
    return (
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-court/30 bg-court/5 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-court/60" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-court" />
          </span>
          <div>
            <p className="font-display text-sm font-bold uppercase tracking-wide text-court">
              Turnier läuft · Live
            </p>
            {remainingLabel && <p className="mt-0.5 text-xs text-muted">{remainingLabel}</p>}
          </div>
        </div>
        <button
          onClick={() => {
            if (window.confirm('Live beenden und zurück zur Vorschau? Ergebnisse bleiben erhalten.'))
              onEndLive();
          }}
          className="rounded-full border border-ink/15 px-3.5 py-1.5 font-display text-sm font-semibold uppercase tracking-wide text-muted transition-colors hover:border-red-400 hover:text-red-600 cursor-pointer"
        >
          Live beenden
        </button>
      </div>
    );
  }

  if (phase === 'published') {
    return (
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-court/30 bg-court/5 px-5 py-4">
        <div>
          <p className="font-display text-sm font-bold uppercase tracking-wide text-court">
            Veröffentlicht · Vorschau
          </p>
          <p className="mt-0.5 text-sm text-muted">
            {dateLabel ? `${dateLabel} · ` : ''}
            <span className="font-semibold tabular-nums text-ink">{remainingLabel}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (window.confirm('Veröffentlichung zurücknehmen? Zuschauer sehen den Plan dann nicht mehr.'))
                onUnpublish();
            }}
            className="rounded-full border border-ink/15 px-3.5 py-1.5 font-display text-sm font-semibold uppercase tracking-wide text-muted transition-colors hover:border-ink hover:text-ink cursor-pointer"
          >
            Zurücknehmen
          </button>
          <button onClick={onGoLive} className="btn-accent">
            Live schalten
          </button>
        </div>
      </div>
    );
  }

  // phase === 'ready'
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-accent/40 bg-accent/10 px-5 py-4">
      <div>
        <p className="font-display text-sm font-bold uppercase tracking-wide text-ink">
          Entwurf · noch nicht öffentlich
        </p>
        <p className="mt-0.5 text-sm text-muted">
          Veröffentlichen macht Gruppen &amp; Spielplan öffentlich — ersetzt ein evtl. anderes
          veröffentlichtes Turnier.
          {dateLabel ? ` Start: ${dateLabel}.` : ''}
        </p>
      </div>
      <button onClick={onPublish} className="btn-accent">
        Veröffentlichen
      </button>
    </div>
  );
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
