import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { checkPassword, setAuthed } from '../../lib/auth';

export default function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (checkPassword(value)) {
      setAuthed();
      onUnlock();
    } else {
      setError(true);
    }
  };

  return (
    <div className="flex min-h-[100svh] items-center justify-center px-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-ink/10 bg-white p-8 shadow-sm"
      >
        <img src="/logo.svg" alt="" aria-hidden="true" className="mx-auto mb-6 h-14 w-14" />
        <h1 className="text-center text-3xl font-bold">Live-Dashboard</h1>
        <p className="mt-2 text-center text-sm text-muted">
          Geschützter Bereich für die Turnierleitung.
        </p>

        <label htmlFor="pw" className="mt-8 block font-display text-sm font-semibold uppercase tracking-wide text-muted">
          Passwort
        </label>
        <input
          id="pw"
          type="password"
          autoFocus
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(false);
          }}
          className="mt-2 w-full rounded-xl border border-ink/15 bg-paper px-4 py-3 text-lg outline-none focus:border-court"
          placeholder="••••••••"
        />
        {error && (
          <p role="alert" className="mt-2 text-sm font-medium text-red-600">
            Falsches Passwort.
          </p>
        )}

        <button type="submit" className="mt-6 btn-accent w-full">
          Entsperren
        </button>

        <Link to="/" className="mt-4 block text-center text-sm text-muted hover:text-ink">
          Zurück zur Startseite
        </Link>
      </form>
    </div>
  );
}
