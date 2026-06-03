// ============================================================================
//  Admin authentication.
//
//  Two modes (mirrors storage.ts):
//   • Supabase configured → real email/password auth. Only authenticated users
//     can write to the DB (enforced by RLS), so this is genuine security.
//   • Not configured → a simple client-side password gate (VITE_ADMIN_PASSWORD),
//     kept for local dev / no-backend deploys. NOT real security.
// ============================================================================

import { isSupabaseConfigured, supabase } from './supabase';

/** True when the admin area uses real (Supabase) auth. */
export const usesRealAuth = isSupabaseConfigured;

// ── Supabase auth ────────────────────────────────────────────────────────────
/** Returns null on success, or an error message. */
export async function signInWithEmail(email: string, password: string): Promise<string | null> {
  if (!supabase) return 'Auth nicht konfiguriert.';
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? error.message : null;
}

export async function signOut(): Promise<void> {
  if (supabase) await supabase.auth.signOut();
  else sessionStorage.removeItem(LOCAL_KEY);
}

/** Current auth state on load. */
export async function getAuthState(): Promise<boolean> {
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    return Boolean(data.session);
  }
  return sessionStorage.getItem(LOCAL_KEY) === '1';
}

/** Subscribe to auth changes (login/logout). Returns unsubscribe. */
export function onAuthChange(cb: (authed: boolean) => void): () => void {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(Boolean(session)));
  return () => data.subscription.unsubscribe();
}

// ── Local fallback password gate ─────────────────────────────────────────────
const LOCAL_KEY = 'hdp:auth';
const FALLBACK_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD ?? 'padel2026';

export function checkLocalPassword(input: string): boolean {
  return input === FALLBACK_PASSWORD;
}

export function setLocalAuthed(): void {
  try {
    sessionStorage.setItem(LOCAL_KEY, '1');
  } catch {
    /* ignore */
  }
}
