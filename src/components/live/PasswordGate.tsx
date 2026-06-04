import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  usesRealAuth,
  signInWithEmail,
  checkLocalPassword,
  setLocalAuthed,
} from '../../lib/auth';

/**
 * Admin login gate. With Supabase configured it's a real email/password login;
 * otherwise it falls back to a simple shared-password field.
 */
export default function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (usesRealAuth) {
      setBusy(true);
      const err = await signInWithEmail(email.trim(), password);
      setBusy(false);
      if (err) {
        // surface the real Supabase reason (e.g. "Invalid login credentials",
        // "Email not confirmed") so the cause is obvious.
        const hint =
          /not confirmed/i.test(err)
            ? 'E-Mail ist noch nicht bestätigt — in Supabase unter Authentication → Users bestätigen.'
            : /invalid login/i.test(err)
              ? 'E-Mail oder Passwort falsch (oder Konto existiert nicht in diesem Projekt).'
              : err;
        setError(hint);
        return;
      }
      onUnlock();
    } else {
      if (checkLocalPassword(password)) {
        setLocalAuthed();
        onUnlock();
      } else {
        setError('Falsches Passwort.');
      }
    }
  };

  return (
    <div className="flex min-h-[100svh] items-center justify-center px-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-ink/10 bg-white p-8 shadow-sm"
      >
        <img src="/logo.svg" alt="" aria-hidden="true" className="mx-auto mb-6 h-14 w-14" />
        <h1 className="text-center text-3xl font-bold uppercase">Admin-Login</h1>
        <p className="mt-2 text-center text-sm text-muted">
          {usesRealAuth
            ? 'Anmeldung für die Turnierleitung.'
            : 'Geschützter Bereich für die Turnierleitung.'}
        </p>

        {usesRealAuth && (
          <>
            <label htmlFor="email" className="mt-8 block font-display text-sm font-semibold uppercase tracking-wide text-muted">
              E-Mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              className="mt-2 w-full rounded-xl border border-ink/15 bg-paper px-4 py-3 text-lg outline-none focus:border-court"
              placeholder="du@example.com"
            />
          </>
        )}

        <label htmlFor="pw" className="mt-5 block font-display text-sm font-semibold uppercase tracking-wide text-muted">
          Passwort
        </label>
        <input
          id="pw"
          type="password"
          autoComplete="current-password"
          autoFocus={!usesRealAuth}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError(null);
          }}
          className="mt-2 w-full rounded-xl border border-ink/15 bg-paper px-4 py-3 text-lg outline-none focus:border-court"
          placeholder="••••••••"
        />

        {error && (
          <p role="alert" className="mt-3 text-sm font-medium text-red-600">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className="mt-6 btn-accent w-full disabled:opacity-60">
          {busy ? 'Anmelden…' : 'Anmelden'}
        </button>

        <Link to="/" className="mt-4 block text-center text-sm text-muted hover:text-ink">
          Zurück zur Startseite
        </Link>
      </form>
    </div>
  );
}
