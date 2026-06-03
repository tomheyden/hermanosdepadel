// ============================================================================
//  Supabase client (single source of truth).
//
//  The app works in two modes:
//   • Supabase configured (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY set) →
//     shared database, realtime sync across devices, and real email/password
//     auth for the admin area.
//   • Not configured → everything falls back to localStorage + a simple
//     password gate, so local dev and a no-backend deploy still work.
// ============================================================================

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;
