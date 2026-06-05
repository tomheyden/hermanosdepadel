import { useState } from 'react';
import { findScenario, getScenario, SUPPORTED_TEAM_COUNTS } from '../../data/scenarios';
import { formatTournamentDate } from '../Countdown';
import type { Tournament, TournamentLibrary } from '../../types';

interface Props {
  library: TournamentLibrary;
  onCreate: (title: string, scenarioId: number, tournamentDate: string) => void;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onPublish: (id: string) => void;
  onUnpublish: () => void;
}

export default function Overview(props: Props) {
  const { library } = props;
  const [creating, setCreating] = useState(library.tournaments.length === 0);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold uppercase">Turniere</h2>
          <p className="mt-2 text-muted">
            Lege Turniere an, trage sie in Ruhe ein — gespeichert wird automatisch. Veröffentlichen
            kannst du immer nur eines.
          </p>
        </div>
        {!creating && (
          <button onClick={() => setCreating(true)} className="btn-accent">
            + Neues Turnier
          </button>
        )}
      </div>

      {creating && (
        <CreateForm
          onCancel={library.tournaments.length ? () => setCreating(false) : undefined}
          onCreate={(title, scenarioId, date) => {
            props.onCreate(title, scenarioId, date);
            setCreating(false);
          }}
        />
      )}

      {library.tournaments.length > 0 && (
        <div className="mt-8 space-y-3">
          {library.tournaments.map((t) => (
            <TournamentCard
              key={t.id}
              tournament={t}
              published={library.publishedId === t.id}
              onSelect={() => props.onSelect(t.id)}
              onRename={(title) => props.onRename(t.id, title)}
              onDelete={() => props.onDelete(t.id)}
              onDuplicate={() => props.onDuplicate(t.id)}
              onPublish={() => props.onPublish(t.id)}
              onUnpublish={props.onUnpublish}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TournamentCard({
  tournament: t,
  published,
  onSelect,
  onRename,
  onDelete,
  onDuplicate,
  onPublish,
  onUnpublish,
}: {
  tournament: Tournament;
  published: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(t.title);
  const scenario = getScenario(t.scenarioId);
  const live = published && t.tournamentStartedAt;
  const dateLabel = formatTournamentDate(t.tournamentDate);

  return (
    <div
      className={`rounded-2xl border bg-white p-5 ${
        published ? 'border-court/40 ring-1 ring-court/15' : 'border-ink/10'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {editing ? (
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => {
                  onRename(title);
                  setEditing(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onRename(title);
                    setEditing(false);
                  }
                  if (e.key === 'Escape') {
                    setTitle(t.title);
                    setEditing(false);
                  }
                }}
                className="rounded-lg border border-court bg-white px-2 py-1 text-xl font-bold outline-none"
              />
            ) : (
              <button
                onClick={() => setEditing(true)}
                title="Umbenennen"
                className="text-left text-xl font-bold hover:text-court cursor-pointer"
              >
                {t.title}
              </button>
            )}
            <StatusBadge published={published} live={Boolean(live)} />
          </div>
          <p className="mt-1 text-sm text-muted">
            {scenario
              ? `${scenario.teamCount} Teams · ${scenario.groups.length} Gruppen · Top ${scenario.qualification.qualifierCount}`
              : 'Unbekanntes Format'}
            {dateLabel ? ` · ${dateLabel}` : ''}
          </p>
        </div>

        <div className="flex flex-shrink-0 flex-wrap items-center gap-1.5">
          {published ? (
            <Pill onClick={onUnpublish} tone="muted">
              Zurücknehmen
            </Pill>
          ) : (
            <Pill onClick={onPublish} tone="court">
              Veröffentlichen
            </Pill>
          )}
          <Pill onClick={onSelect} tone="accent">
            Öffnen
          </Pill>
          <Pill onClick={onDuplicate} tone="muted">
            Duplizieren
          </Pill>
          <Pill
            onClick={() => {
              if (window.confirm(`„${t.title}" wirklich löschen? Das lässt sich nicht rückgängig machen.`))
                onDelete();
            }}
            tone="danger"
          >
            Löschen
          </Pill>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ published, live }: { published: boolean; live: boolean }) {
  if (live)
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-court px-2.5 py-0.5 font-display text-xs font-bold uppercase tracking-wide text-paper">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Live
      </span>
    );
  if (published)
    return (
      <span className="rounded-full bg-court/10 px-2.5 py-0.5 font-display text-xs font-bold uppercase tracking-wide text-court">
        Veröffentlicht
      </span>
    );
  return (
    <span className="rounded-full bg-ink/10 px-2.5 py-0.5 font-display text-xs font-bold uppercase tracking-wide text-muted">
      Entwurf
    </span>
  );
}

function Pill({
  onClick,
  tone,
  children,
}: {
  onClick: () => void;
  tone: 'accent' | 'court' | 'muted' | 'danger';
  children: React.ReactNode;
}) {
  const tones: Record<string, string> = {
    accent: 'border-accent/50 text-accent-ink bg-accent/15 hover:border-accent',
    court: 'border-court/40 text-court hover:border-court',
    muted: 'border-ink/15 text-muted hover:border-ink hover:text-ink',
    danger: 'border-ink/15 text-muted hover:border-red-400 hover:text-red-600',
  };
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 font-display text-xs font-semibold uppercase tracking-wide transition-colors cursor-pointer ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

// ── Create form ───────────────────────────────────────────────────────────────
const KO_MODES = [
  { qualifierCount: 4, label: 'Top 4' },
  { qualifierCount: 8, label: 'Top 8' },
];

function CreateForm({
  onCreate,
  onCancel,
}: {
  onCreate: (title: string, scenarioId: number, date: string) => void;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState('');
  const [teamCount, setTeamCount] = useState(12);
  const [qualifierCount, setQualifierCount] = useState(8);
  const [date, setDate] = useState('');

  const scenario = findScenario(teamCount, qualifierCount);
  const canCreate = !!scenario && !!date && !!title.trim();

  return (
    <div className="mt-6 rounded-2xl border border-ink/10 bg-white p-6">
      <h3 className="font-display text-lg font-bold uppercase tracking-wide">Neues Turnier</h3>

      <div className="mt-5 space-y-5">
        <Field label="Name des Turniers">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="z.B. Hermanos Sommer-Cup 2026"
            className="w-full rounded-xl border border-ink/15 bg-white px-4 py-3 font-semibold outline-none focus:border-court"
          />
        </Field>

        <Field label="Wie viele Teams machen mit?">
          <div className="flex flex-wrap gap-2">
            {SUPPORTED_TEAM_COUNTS.map((n) => (
              <Choice key={n} active={teamCount === n} onClick={() => setTeamCount(n)}>
                {n} Teams
              </Choice>
            ))}
          </div>
        </Field>

        <Field label="Wie viele Teams ziehen in die KO-Phase?">
          <div className="flex flex-wrap gap-2">
            {KO_MODES.map((m) => {
              const available = !!findScenario(teamCount, m.qualifierCount);
              return (
                <Choice
                  key={m.qualifierCount}
                  active={qualifierCount === m.qualifierCount}
                  disabled={!available}
                  onClick={() => setQualifierCount(m.qualifierCount)}
                >
                  {m.label}
                </Choice>
              );
            })}
          </div>
        </Field>

        <Field label="Spieltag & erster Aufschlag">
          <input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl border border-ink/15 bg-white px-4 py-3 font-semibold outline-none focus:border-court"
          />
          <p className="mt-1.5 text-xs text-muted">
            Das erste Gruppenspiel startet zu dieser Uhrzeit; der Spielplan richtet sich danach aus.
          </p>
        </Field>

        {scenario ? (
          <p className="text-sm text-muted">
            Format: {scenario.groups.length} Gruppen, {scenario.description}
          </p>
        ) : (
          <p className="text-sm text-red-600">Für diese Kombination gibt es keinen Spielplan.</p>
        )}
      </div>

      <div className="mt-6 flex justify-end gap-2">
        {onCancel && (
          <button
            onClick={onCancel}
            className="rounded-full border border-ink/15 px-4 py-2 font-display text-sm font-semibold uppercase tracking-wide text-muted transition-colors hover:border-ink hover:text-ink cursor-pointer"
          >
            Abbrechen
          </button>
        )}
        <button
          onClick={() => scenario && onCreate(title, scenario.id, date)}
          disabled={!canCreate}
          className="btn-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          Turnier anlegen
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 font-display text-sm font-semibold uppercase tracking-wide text-ink">
        {label}
      </p>
      {children}
    </div>
  );
}

function Choice({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl border px-5 py-3 text-center font-display text-base font-semibold uppercase tracking-wide transition-colors ${
        active ? 'border-court bg-court text-paper' : 'border-ink/15 bg-white text-ink hover:border-court'
      } ${disabled ? 'cursor-not-allowed opacity-30 hover:border-ink/15' : 'cursor-pointer'}`}
    >
      {children}
    </button>
  );
}
