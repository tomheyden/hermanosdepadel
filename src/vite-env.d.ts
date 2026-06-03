/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase Projekt-URL (z.B. https://xyz.supabase.co). */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase "anon public" key (darf im Frontend stehen, RLS schützt). */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Fallback-Passwort, falls KEIN Supabase konfiguriert ist. */
  readonly VITE_ADMIN_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
