// ============================================================================
//  Storage abstraction.
//
//  Components and hooks NEVER touch localStorage directly — they go through
//  this `storage` object. To move to Supabase/Firebase later, implement the
//  same `Storage` interface (async-friendly: every method already returns a
//  Promise) in a new file and swap the exported `storage` instance below.
// ============================================================================

import type { TournamentState } from '../types';

const STORAGE_KEY = 'hdp:tournament:v1';

export interface Storage {
  load(): Promise<TournamentState | null>;
  save(state: TournamentState): Promise<void>;
  clear(): Promise<void>;
  /** Subscribe to external changes (e.g. another tab). Returns an unsubscribe fn. */
  subscribe(listener: (state: TournamentState | null) => void): () => void;
}

class LocalStorageBackend implements Storage {
  async load(): Promise<TournamentState | null> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as TournamentState;
    } catch (err) {
      // Corrupt / unparseable data shouldn't crash the app.
      console.error('[storage] failed to load tournament state', err);
      return null;
    }
  }

  async save(state: TournamentState): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.error('[storage] failed to save tournament state', err);
    }
  }

  async clear(): Promise<void> {
    localStorage.removeItem(STORAGE_KEY);
  }

  subscribe(listener: (state: TournamentState | null) => void): () => void {
    // `storage` events fire in OTHER tabs/windows of the same origin — perfect
    // for the read-only /live/view beamer screen reacting to the dashboard.
    const handler = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      listener(e.newValue ? (JSON.parse(e.newValue) as TournamentState) : null);
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }
}

export const storage: Storage = new LocalStorageBackend();
