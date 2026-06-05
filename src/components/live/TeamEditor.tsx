import type { GroupId, Scenario, SlotId, Team } from '../../types';

interface Props {
  scenario: Scenario; // already derived: group labels reflect any overrides
  teams: Record<SlotId, Team>;
  onUpdateTeam: (slot: SlotId, patch: Partial<Team>) => void;
  onSetGroupLabel: (group: GroupId, label: string) => void;
}

/**
 * Edit team & group names at any time — during setup, after publishing, even
 * while live. Every keystroke is persisted (and pushed to the public view).
 */
export default function TeamEditor({ scenario, teams, onUpdateTeam, onSetGroupLabel }: Props) {
  return (
    <div>
      <div>
        <h2 className="text-3xl font-bold uppercase">Teams &amp; Gruppen</h2>
        <p className="mt-2 text-muted">
          Namen lassen sich jederzeit ändern — auch nach dem Veröffentlichen. Wird automatisch
          gespeichert.
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {scenario.groups.map((group) => (
          <fieldset key={group.id} className="rounded-2xl border border-ink/10 bg-white p-5">
            <legend className="px-2">
              <input
                value={group.label}
                onChange={(e) => onSetGroupLabel(group.id, e.target.value)}
                aria-label={`Name für ${group.label}`}
                className="rounded-lg border border-transparent bg-transparent px-1 py-0.5 font-display text-lg font-bold uppercase tracking-wide text-court outline-none hover:border-ink/15 focus:border-court focus:bg-paper"
              />
            </legend>
            <div className="space-y-4">
              {group.slots.map((slot, i) => {
                const team = teams[slot];
                if (!team) return null;
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
    </div>
  );
}
