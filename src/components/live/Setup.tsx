import { SCENARIOS } from '../../data/scenarios';
import type { Scenario, SlotId, Team, TournamentState } from '../../types';

interface Props {
  state: TournamentState | null;
  scenario?: Scenario;
  onPickScenario: (id: number) => void;
  onUpdateTeam: (slot: SlotId, patch: Partial<Team>) => void;
  onConfirm: () => void;
  onReset: () => void;
}

export default function Setup(props: Props) {
  if (!props.state || !props.scenario) {
    return <ScenarioPicker onPick={props.onPickScenario} />;
  }
  return (
    <TeamSetup
      scenario={props.scenario}
      teams={props.state.teams}
      onUpdateTeam={props.onUpdateTeam}
      onConfirm={props.onConfirm}
      onReset={props.onReset}
    />
  );
}

function ScenarioPicker({ onPick }: { onPick: (id: number) => void }) {
  return (
    <div>
      <h2 className="text-3xl font-bold uppercase">Szenario wählen</h2>
      <p className="mt-2 text-muted">
        Das Szenario legt Teamzahl, Gruppen, Spielplan und KO-Modus fest.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            onClick={() => onPick(s.id)}
            className="group flex flex-col rounded-2xl border border-ink/10 bg-white p-6 text-left transition-colors duration-200 hover:border-court cursor-pointer"
          >
            <span className="font-display text-sm font-semibold uppercase tracking-wide text-accent-ink">
              <span className="bg-accent px-2 py-0.5">Szenario {s.id}</span>
            </span>
            <h3 className="mt-4 text-2xl font-bold uppercase leading-tight">{s.name}</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{s.description}</p>
            <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-ink/10 pt-4 text-center">
              <Stat label="Teams" value={String(s.teamCount)} />
              <Stat label="Gruppen" value={String(s.groups.length)} />
              <Stat label="Ende" value={s.endTime} />
            </dl>
          </button>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dd className="font-display text-lg font-bold text-court">{value}</dd>
      <dt className="font-display text-[0.65rem] uppercase tracking-wide text-muted">{label}</dt>
    </div>
  );
}

function TeamSetup({
  scenario,
  teams,
  onUpdateTeam,
  onConfirm,
  onReset,
}: {
  scenario: Scenario;
  teams: Record<SlotId, Team>;
  onUpdateTeam: (slot: SlotId, patch: Partial<Team>) => void;
  onConfirm: () => void;
  onReset: () => void;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold uppercase">Teams benennen</h2>
          <p className="mt-2 text-muted">
            Szenario {scenario.id} · {scenario.name}. Namen lassen sich später jederzeit ändern.
          </p>
        </div>
        <button
          onClick={onReset}
          className="rounded-full border border-ink/15 px-4 py-2 font-display text-sm font-semibold uppercase tracking-wide text-muted transition-colors hover:border-ink hover:text-ink cursor-pointer"
        >
          Anderes Szenario
        </button>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {scenario.groups.map((group) => (
          <fieldset key={group.id} className="rounded-2xl border border-ink/10 bg-white p-5">
            <legend className="px-2 font-display text-lg font-bold uppercase tracking-wide text-court">
              {group.label}
            </legend>
            <div className="space-y-4">
              {group.slots.map((slot, i) => {
                const team = teams[slot];
                return (
                  <div key={slot} className="rounded-xl bg-paper p-3">
                    <label
                      htmlFor={`name-${slot}`}
                      className="font-display text-xs font-semibold uppercase tracking-wide text-muted"
                    >
                      Team {i + 1}
                    </label>
                    <input
                      id={`name-${slot}`}
                      value={team.name}
                      onChange={(e) => onUpdateTeam(slot, { name: e.target.value })}
                      placeholder={`Team ${i + 1}`}
                      className="mt-1 w-full rounded-lg border border-ink/15 bg-white px-3 py-2 font-semibold outline-none focus:border-court"
                    />
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <input
                        aria-label={`${team.name} Spieler 1`}
                        value={team.player1}
                        onChange={(e) => onUpdateTeam(slot, { player1: e.target.value })}
                        placeholder="Spieler 1"
                        className="w-full rounded-lg border border-ink/15 bg-white px-3 py-1.5 text-sm outline-none focus:border-court"
                      />
                      <input
                        aria-label={`${team.name} Spieler 2`}
                        value={team.player2}
                        onChange={(e) => onUpdateTeam(slot, { player2: e.target.value })}
                        placeholder="Spieler 2"
                        className="w-full rounded-lg border border-ink/15 bg-white px-3 py-1.5 text-sm outline-none focus:border-court"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      <div className="mt-8 flex justify-end">
        <button onClick={onConfirm} className="btn-accent">
          Turnier starten
        </button>
      </div>
    </div>
  );
}
