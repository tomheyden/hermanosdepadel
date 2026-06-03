/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Passwort für den Admin-Bereich. Wird bei Vercel als Env-Variable gesetzt. */
  readonly VITE_ADMIN_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
