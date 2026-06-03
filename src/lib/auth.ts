// ============================================================================
//  Simple password gate for the admin area.
//
//  The password comes from the env var VITE_ADMIN_PASSWORD (set it locally in
//  `.env.local` and on Vercel under Settings → Environment Variables). If unset,
//  it falls back to the default below so local dev still works.
//
//  ⚠️ This is a CLIENT-SIDE gate only. Because this is a static Vite build, the
//  value is bundled into the JavaScript and is technically visible to anyone who
//  inspects it — it keeps the admin area out of casual reach, it is NOT real
//  security. Real protection would require a backend.
const DASHBOARD_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD ?? 'padel2026';
// ============================================================================

const SESSION_KEY = 'hdp:auth';

export function checkPassword(input: string): boolean {
  return input === DASHBOARD_PASSWORD;
}

export function isAuthed(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function setAuthed(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    /* ignore */
  }
}
