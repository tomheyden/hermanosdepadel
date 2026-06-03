import { useState } from 'react';
import { Link } from 'react-router-dom';
import { isAuthed } from '../lib/auth';
import { useTournament } from '../hooks/useTournament';
import PasswordGate from '../components/live/PasswordGate';
import Setup from '../components/live/Setup';
import ScheduleView from '../components/live/ScheduleView';
import GroupStandings from '../components/live/GroupStandings';
import BracketView from '../components/live/BracketView';
import FinalStandings from '../components/live/FinalStandings';

type Tab = 'schedule' | 'groups' | 'bracket' | 'final';
const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'schedule', label: 'Spielplan' },
  { id: 'groups', label: 'Gruppen' },
  { id: 'bracket', label: 'KO-Baum' },
  { id: 'final', label: 'Endstand' },
];

export default function Live() {
  const [authed, setAuthedState] = useState(isAuthed());
  const [tab, setTab] = useState<Tab>('schedule');
  const { state, loaded, scenario, actions } = useTournament();

  if (!authed) return <PasswordGate onUnlock={() => setAuthedState(true)} />;

  if (!loaded) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center text-muted">Lädt…</div>
    );
  }

  const inSetup = !state || !state.setupComplete;

  const handleReset = () => {
    if (window.confirm('Turnier wirklich zurücksetzen? Alle Ergebnisse und Teamnamen gehen verloren.')) {
      actions.reset();
      setTab('schedule');
    }
  };

  return (
    <div className="min-h-[100svh] bg-paper">
      {/* top bar */}
      <header className="sticky top-0 z-20 border-b border-ink/10 bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-content items-center justify-between gap-4 px-5 py-3">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="" aria-hidden="true" className="h-9 w-9" />
            <div className="leading-tight">
              <p className="font-display text-base font-bold uppercase tracking-wide">
                Admin · Eingabe
              </p>
              {scenario && <p className="text-xs text-muted">{scenario.name}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Link
              to="/"
              className="hidden rounded-full px-3.5 py-1.5 font-display text-sm font-semibold uppercase tracking-wide text-muted transition-colors hover:bg-ink/5 hover:text-ink sm:inline-block"
            >
              Start
            </Link>
            <Link
              to="/turnier"
              target="_blank"
              className="rounded-full border border-court/30 px-3.5 py-1.5 font-display text-sm font-semibold uppercase tracking-wide text-court transition-colors hover:border-court"
            >
              Turnier-Ansicht
            </Link>
            {!inSetup && (
              <button
                onClick={handleReset}
                className="rounded-full border border-ink/15 px-3.5 py-1.5 font-display text-sm font-semibold uppercase tracking-wide text-muted transition-colors hover:border-red-400 hover:text-red-600 cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {!inSetup && (
          <nav className="mx-auto flex max-w-content gap-1 overflow-x-auto px-5 pb-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 font-display text-sm font-semibold uppercase tracking-wide transition-colors cursor-pointer ${
                  tab === t.id
                    ? 'bg-court text-paper'
                    : 'text-muted hover:bg-ink/5 hover:text-ink'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-content px-5 py-8 md:py-10">
        {inSetup ? (
          <Setup
            state={state}
            scenario={scenario}
            onPickScenario={actions.initTournament}
            onUpdateTeam={actions.updateTeam}
            onConfirm={actions.confirmSetup}
            onReset={actions.reset}
          />
        ) : (
          state &&
          scenario && (
            <>
              {tab === 'schedule' && (
                <ScheduleView
                  scenario={scenario}
                  teams={state.teams}
                  results={state.results}
                  onSave={actions.setResult}
                  onClear={actions.clearResult}
                />
              )}
              {tab === 'groups' && (
                <GroupStandings scenario={scenario} teams={state.teams} results={state.results} />
              )}
              {tab === 'bracket' && (
                <BracketView
                  scenario={scenario}
                  teams={state.teams}
                  results={state.results}
                  onSave={actions.setResult}
                  onClear={actions.clearResult}
                />
              )}
              {tab === 'final' && (
                <FinalStandings scenario={scenario} teams={state.teams} results={state.results} />
              )}
            </>
          )
        )}
      </main>
    </div>
  );
}
