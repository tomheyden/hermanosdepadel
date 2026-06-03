// ============================================================================
//  Storage abstraction.
//
//  Components and hooks NEVER touch the persistence layer directly — they go
//  through the `storage` object. Two implementations exist behind the same
//  interface:
//    • SupabaseBackend     — shared Postgres row + realtime (when configured)
//    • LocalStorageBackend — per-browser fallback (no backend needed)
//  The right one is chosen at the bottom based on whether Supabase is set up.
// ============================================================================

import type { TournamentState } from '../types';
import { isSupabaseConfigured, supabase } from './supabase';

const STORAGE_KEY = 'hdp:tournament:v1';
/** Single active tournament → one fixed row. */
const ROW_ID = 1;

export interface Storage {
  load(): Promise<TournamentState | null>;
  save(state: TournamentState): Promise<void>;
  clear(): Promise<void>;
  /** Subscribe to external changes (other tabs / other devices). Returns unsubscribe. */
  subscribe(listener: (state: TournamentState | null) => void): () => void;
}

// ── localStorage (fallback / offline) ────────────────────────────────────────
class LocalStorageBackend implements Storage {
  async load(): Promise<TournamentState | null> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as TournamentState) : null;
    } catch (err) {
      console.error('[storage] failed to load', err);
      return null;
    }
  }

  async save(state: TournamentState): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.error('[storage] failed to save', err);
    }
  }

  async clear(): Promise<void> {
    localStorage.removeItem(STORAGE_KEY);
  }

  subscribe(listener: (state: TournamentState | null) => void): () => void {
    // `storage` events fire in OTHER tabs of the same browser only.
    const handler = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      listener(e.newValue ? (JSON.parse(e.newValue) as TournamentState) : null);
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }
}

// ── Supabase (shared DB + realtime) ──────────────────────────────────────────
class SupabaseBackend implements Storage {
  async load(): Promise<TournamentState | null> {
    const { data, error } = await supabase!
      .from('tournament')
      .select('state')
      .eq('id', ROW_ID)
      .maybeSingle();
    if (error) {
      console.error('[storage] supabase load failed', error.message);
      return null;
    }
    return (data?.state as TournamentState) ?? null;
  }

  async save(state: TournamentState): Promise<void> {
    // Requires an authenticated admin session (enforced by RLS).
    const { error } = await supabase!
      .from('tournament')
      .upsert({ id: ROW_ID, state, updated_at: new Date().toISOString() });
    if (error) console.error('[storage] supabase save failed', error.message);
  }

  async clear(): Promise<void> {
    const { error } = await supabase!.from('tournament').delete().eq('id', ROW_ID);
    if (error) console.error('[storage] supabase clear failed', error.message);
  }

  subscribe(listener: (state: TournamentState | null) => void): () => void {
    const channel = supabase!
      .channel('tournament-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tournament', filter: `id=eq.${ROW_ID}` },
        (payload) => {
          const row = payload.new as { state?: TournamentState } | null;
          listener(row?.state ?? null);
        },
      )
      .subscribe();
    return () => {
      void supabase!.removeChannel(channel);
    };
  }
}

export const storage: Storage = isSupabaseConfigured
  ? new SupabaseBackend()
  : new LocalStorageBackend();
