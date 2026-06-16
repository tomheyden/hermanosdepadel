import { useEffect, useState } from 'react';
import { WarnIcon } from '../icons';

interface Props {
  /** the currently saved (public) message — '' when none */
  value: string;
  onSave: (message: string) => void;
}

/**
 * Admin editor for the critical announcement. Uses an explicit "Speichern"
 * button (not save-on-keystroke) so a half-typed message is never broadcast —
 * the message only goes public when the admin confirms it.
 */
export default function CriticalMessageEditor({ value, onSave }: Props) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  const active = value.trim().length > 0;
  const dirty = draft.trim() !== value.trim();

  return (
    <section className="mb-8 rounded-2xl border border-amber-300/70 bg-amber-50 px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <WarnIcon className="h-5 w-5 text-amber-600" />
          <h3 className="font-display text-sm font-bold uppercase tracking-wide text-ink">
            Kritische Meldung
          </h3>
        </div>
        {active && (
          <span className="flex items-center gap-1.5 font-display text-xs font-semibold uppercase tracking-wide text-amber-700">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
            Aktiv · für alle sichtbar
          </span>
        )}
      </div>

      <p className="mt-1 text-xs text-muted">
        Wird oben auf der Turnier-Ansicht für alle Teams angezeigt (z.&nbsp;B. „Der Spielplan der
        Gruppenphase wurde geändert").
      </p>

      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={2}
        placeholder="z. B. Achtung: Der Spielplan der Gruppenphase wurde aktualisiert."
        className="mt-3 w-full resize-y rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-court focus:outline-none focus:ring-2 focus:ring-court/20"
      />

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => onSave(draft)}
          disabled={!dirty}
          className="rounded-full bg-court px-4 py-1.5 font-display text-sm font-semibold uppercase tracking-wide text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {active ? 'Aktualisieren' : 'Veröffentlichen'}
        </button>
        {active && (
          <button
            onClick={() => {
              setDraft('');
              onSave('');
            }}
            className="rounded-full border border-ink/15 px-4 py-1.5 font-display text-sm font-semibold uppercase tracking-wide text-muted transition-colors hover:border-red-400 hover:text-red-600 cursor-pointer"
          >
            Entfernen
          </button>
        )}
      </div>
    </section>
  );
}
