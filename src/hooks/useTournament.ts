import { useCallback, useEffect, useState } from 'react';
import { storage } from '../lib/storage';
import { getScenario } from '../data/scenarios';
import type { MatchResult, SlotId, Team, TournamentState } from '../types';

/**
 * Central tournament state. Loads from the storage abstraction on mount, keeps
 * an in-memory copy, and persists every mutation. Also subscribes to external
 * changes (other tabs) so the dashboard and the /live/view beamer stay in sync.
 */
export function useTournament() {
  const [state, setState] = useState<TournamentState | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    storage.load().then((s) => {
      if (!active) return;
      setState(s);
      setLoaded(true);
    });
    const unsub = storage.subscribe((s) => setState(s));
    return () => {
      active = false;
      unsub();
    };
  }, []);

  // Persist + update local copy in one go.
  const commit = useCallback((next: TournamentState) => {
    setState(next);
    void storage.save(next);
  }, []);

  /** Create a fresh tournament for a scenario (default team names = slot ids). */
  const initTournament = useCallback(
    (scenarioId: number) => {
      const scenario = getScenario(scenarioId);
      if (!scenario) return;
      const teams: Record<SlotId, Team> = {};
      for (const group of scenario.groups) {
        group.slots.forEach((slot, i) => {
          teams[slot] = {
            id: slot,
            name: `${group.label} · Team ${i + 1}`,
            player1: '',
            player2: '',
            group: group.id,
          };
        });
      }
      commit({
        scenarioId,
        teams,
        results: {},
        createdAt: Date.now(),
        setupComplete: false,
      });
    },
    [commit],
  );

  const updateTeam = useCallback(
    (slot: SlotId, patch: Partial<Team>) => {
      setState((prev) => {
        if (!prev) return prev;
        const next = {
          ...prev,
          teams: { ...prev.teams, [slot]: { ...prev.teams[slot], ...patch } },
        };
        void storage.save(next);
        return next;
      });
    },
    [],
  );

  const confirmSetup = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev;
      const next = { ...prev, setupComplete: true };
      void storage.save(next);
      return next;
    });
  }, []);

  const setResult = useCallback((result: MatchResult) => {
    setState((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        results: { ...prev.results, [result.matchId]: result },
      };
      void storage.save(next);
      return next;
    });
  }, []);

  const clearResult = useCallback((matchId: string) => {
    setState((prev) => {
      if (!prev) return prev;
      const results = { ...prev.results };
      delete results[matchId];
      const next = { ...prev, results };
      void storage.save(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setState(null);
    void storage.clear();
  }, []);

  return {
    state,
    loaded,
    scenario: state ? getScenario(state.scenarioId) : undefined,
    actions: { initTournament, updateTeam, confirmSetup, setResult, clearResult, reset },
  };
}
