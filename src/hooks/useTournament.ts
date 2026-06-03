import { useCallback, useEffect, useState } from 'react';
import { storage } from '../lib/storage';
import { getScenario } from '../data/scenarios';
import type { MatchResult, SetScore, SlotId, Team, TournamentState } from '../types';

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

  /** Start one or more matches (both courts of a slot share the same start).
   *  Initialises a 0:0 live score so they become "active". */
  const startSlot = useCallback((matchIds: string[]) => {
    setState((prev) => {
      if (!prev) return prev;
      const now = Date.now();
      const startedAt = { ...(prev.startedAt ?? {}) };
      const liveScores = { ...(prev.liveScores ?? {}) };
      for (const id of matchIds) {
        startedAt[id] = now;
        liveScores[id] = { home: 0, away: 0 };
      }
      const next = { ...prev, startedAt, liveScores };
      void storage.save(next);
      return next;
    });
  }, []);

  /** Clear timer + live score for matches (e.g. misclick / restart a slot). */
  const clearSlotStart = useCallback((matchIds: string[]) => {
    setState((prev) => {
      if (!prev) return prev;
      const startedAt = { ...(prev.startedAt ?? {}) };
      const liveScores = { ...(prev.liveScores ?? {}) };
      for (const id of matchIds) {
        delete startedAt[id];
        delete liveScores[id];
      }
      const next = { ...prev, startedAt, liveScores };
      void storage.save(next);
      return next;
    });
  }, []);

  /** Live +/- on the in-progress score of an active match (clamped at 0). */
  const adjustScore = useCallback((matchId: string, side: 'home' | 'away', delta: number) => {
    setState((prev) => {
      if (!prev) return prev;
      const current: SetScore = prev.liveScores?.[matchId] ?? { home: 0, away: 0 };
      const updated: SetScore = { ...current, [side]: Math.max(0, current[side] + delta) };
      const liveScores = { ...(prev.liveScores ?? {}), [matchId]: updated };
      const next = { ...prev, liveScores };
      void storage.save(next);
      return next;
    });
  }, []);

  /** Finalise an active match: live score → results, remove from liveScores. */
  const finishMatch = useCallback((matchId: string) => {
    setState((prev) => {
      if (!prev) return prev;
      const score = prev.liveScores?.[matchId] ?? { home: 0, away: 0 };
      const results = { ...prev.results, [matchId]: { matchId, sets: [score] } };
      const liveScores = { ...(prev.liveScores ?? {}) };
      delete liveScores[matchId];
      const next = { ...prev, results, liveScores };
      void storage.save(next);
      return next;
    });
  }, []);

  /** Re-open a finalised match for corrections (result → live score again). */
  const reopenMatch = useCallback((matchId: string) => {
    setState((prev) => {
      if (!prev) return prev;
      const score = prev.results[matchId]?.sets[0] ?? { home: 0, away: 0 };
      const results = { ...prev.results };
      delete results[matchId];
      const startedAt = { ...(prev.startedAt ?? {}), [matchId]: prev.startedAt?.[matchId] ?? Date.now() };
      const liveScores = { ...(prev.liveScores ?? {}), [matchId]: score };
      const next = { ...prev, results, startedAt, liveScores };
      void storage.save(next);
      return next;
    });
  }, []);

  return {
    state,
    loaded,
    scenario: state ? getScenario(state.scenarioId) : undefined,
    actions: {
      initTournament,
      updateTeam,
      confirmSetup,
      setResult,
      clearResult,
      reset,
      startSlot,
      clearSlotStart,
      adjustScore,
      finishMatch,
      reopenMatch,
    },
  };
}
