// ============================================================================
//  Storage abstraction.
//
//  Components and hooks NEVER touch the persistence layer directly — they go
//  through the `storage` object. It persists the whole TournamentLibrary (many
//  tournaments, at most one published) as a single JSONB blob. Two backends:
//    • SupabaseBackend     — shared Postgres row + realtime (when configured)
//    • LocalStorageBackend — per-browser fallback (no backend needed)
// ============================================================================

import type { Tournament, TournamentLibrary, TournamentState } from '../types';
import { isSupabaseConfigured, supabase } from './supabase';

const STORAGE_KEY = 'hdp:tournament:v1';
/** Single library blob → one fixed row. */
const ROW_ID = 1;

const EMPTY: TournamentLibrary = { tournaments: [], publishedId: null };

/** Short unique id for a tournament. */
export function newTournamentId(): string {
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Coerce whatever sits in storage into a TournamentLibrary. Handles three cases:
 *  - already a library  → returned as-is
 *  - the old single-tournament blob (has `scenarioId`) → wrapped into a library
 *  - null / unknown      → an empty library
 */
function migrate(raw: unknown): TournamentLibrary {
  if (!raw || typeof raw !== 'object') return EMPTY;
  if (Array.isArray((raw as TournamentLibrary).tournaments)) {
    return raw as TournamentLibrary;
  }
  const legacy = raw as Partial<TournamentState>;
  if (typeof legacy.scenarioId === 'number') {
    const id = newTournamentId();
    const tournament: Tournament = {
      ...(legacy as TournamentState),
      id,
      title: 'Turnier',
    };
    // Keep it public if it was already live/published in the old model.
    const wasPublic = Boolean(
      (legacy as { publishedAt?: number }).publishedAt || legacy.tournamentStartedAt,
    );
    return { tournaments: [tournament], publishedId: wasPublic ? id : null };
  }
  return EMPTY;
}

export interface Storage {
  load(): Promise<TournamentLibrary>;
  save(library: TournamentLibrary): Promise<void>;
  clear(): Promise<void>;
  /** Subscribe to external changes (other tabs / other devices). Returns unsubscribe. */
  subscribe(listener: (library: TournamentLibrary) => void): () => void;
}

// ── localStorage (fallback / offline) ────────────────────────────────────────
class LocalStorageBackend implements Storage {
  async load(): Promise<TournamentLibrary> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return migrate(raw ? JSON.parse(raw) : null);
    } catch (err) {
      console.error('[storage] failed to load', err);
      return EMPTY;
    }
  }

  async save(library: TournamentLibrary): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
    } catch (err) {
      console.error('[storage] failed to save', err);
    }
  }

  async clear(): Promise<void> {
    localStorage.removeItem(STORAGE_KEY);
  }

  subscribe(listener: (library: TournamentLibrary) => void): () => void {
    // `storage` events fire in OTHER tabs of the same browser only.
    const handler = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      listener(migrate(e.newValue ? JSON.parse(e.newValue) : null));
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }
}

// ── Supabase (shared DB + realtime) ──────────────────────────────────────────
class SupabaseBackend implements Storage {
  async load(): Promise<TournamentLibrary> {
    const { data, error } = await supabase!
      .from('tournament')
      .select('state')
      .eq('id', ROW_ID)
      .maybeSingle();
    if (error) {
      console.error('[storage] supabase load failed', error.message);
      return EMPTY;
    }
    return migrate(data?.state ?? null);
  }

  async save(library: TournamentLibrary): Promise<void> {
    // Requires an authenticated admin session (enforced by RLS).
    const { error } = await supabase!
      .from('tournament')
      .upsert({ id: ROW_ID, state: library, updated_at: new Date().toISOString() });
    if (error) console.error('[storage] supabase save failed', error.message);
  }

  async clear(): Promise<void> {
    const { error } = await supabase!.from('tournament').delete().eq('id', ROW_ID);
    if (error) console.error('[storage] supabase clear failed', error.message);
  }

  subscribe(listener: (library: TournamentLibrary) => void): () => void {
    const channel = supabase!
      .channel('tournament-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tournament', filter: `id=eq.${ROW_ID}` },
        (payload) => {
          const row = payload.new as { state?: unknown } | null;
          listener(migrate(row?.state ?? null));
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
