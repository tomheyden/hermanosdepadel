import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { newTournamentId, storage } from '../lib/storage';
import { deriveScenario, getScenario } from '../data/scenarios';
import type {
  GroupId,
  MatchResult,
  SetScore,
  SlotId,
  Team,
  Tournament,
  TournamentLibrary,
  TournamentPhase,
} from '../types';

const EMPTY_LIBRARY: TournamentLibrary = { tournaments: [], publishedId: null };

/** Default team roster for a scenario (names = "Gruppe N · Team i"). */
function buildTeams(scenarioId: number): Record<SlotId, Team> {
  const scenario = getScenario(scenarioId);
  const teams: Record<SlotId, Team> = {};
  if (!scenario) return teams;
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
  return teams;
}

/** Lifecycle phase of a tournament, given which one is published. */
export function phaseOf(t: Tournament | null, publishedId: string | null): TournamentPhase {
  if (!t || !t.setupComplete) return 'setup';
  if (publishedId !== t.id) return 'ready';
  if (!t.tournamentStartedAt) return 'published';
  return 'live';
}

// ============================================================================
//  Admin hook — the whole library plus the currently edited tournament.
// ============================================================================
export function useLibrary() {
  const [library, setLibrary] = useState<TournamentLibrary | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeRef = useRef<string | null>(null);
  activeRef.current = activeId;

  useEffect(() => {
    let alive = true;
    storage.load().then((lib) => {
      if (!alive) return;
      setLibrary(lib);
      setLoaded(true);
    });
    const unsub = storage.subscribe((lib) => setLibrary(lib));
    return () => {
      alive = false;
      unsub();
    };
  }, []);

  /** Update the active tournament in place and persist. */
  const mutateActive = useCallback((updater: (t: Tournament) => Tournament) => {
    setLibrary((prev) => {
      if (!prev) return prev;
      const id = activeRef.current;
      const idx = prev.tournaments.findIndex((t) => t.id === id);
      if (idx < 0) return prev;
      const tournaments = [...prev.tournaments];
      tournaments[idx] = updater(tournaments[idx]);
      const next = { ...prev, tournaments };
      void storage.save(next);
      return next;
    });
  }, []);

  // ── Library-level actions ──────────────────────────────────────────────────
  const createTournament = useCallback(
    (title: string, scenarioId: number, tournamentDate?: string) => {
      if (!getScenario(scenarioId)) return;
      const id = newTournamentId();
      const tournament: Tournament = {
        id,
        title: title.trim() || 'Neues Turnier',
        scenarioId,
        tournamentDate,
        teams: buildTeams(scenarioId),
        groupLabels: {},
        results: {},
        createdAt: Date.now(),
        setupComplete: true,
      };
      setLibrary((prev) => {
        const base = prev ?? EMPTY_LIBRARY;
        const next = { ...base, tournaments: [...base.tournaments, tournament] };
        void storage.save(next);
        return next;
      });
      setActiveId(id);
    },
    [],
  );

  const renameTournament = useCallback(
    (id: string, title: string) => {
      setLibrary((prev) => {
        if (!prev) return prev;
        const next = {
          ...prev,
          tournaments: prev.tournaments.map((t) =>
            t.id === id ? { ...t, title: title.trim() || t.title } : t,
          ),
        };
        void storage.save(next);
        return next;
      });
    },
    [],
  );

  const duplicateTournament = useCallback((id: string) => {
    setLibrary((prev) => {
      if (!prev) return prev;
      const src = prev.tournaments.find((t) => t.id === id);
      if (!src) return prev;
      const copy: Tournament = {
        ...src,
        id: newTournamentId(),
        title: `${src.title} (Kopie)`,
        results: {},
        startedAt: {},
        liveScores: {},
        liveSets: {},
        tournamentStartedAt: undefined,
        createdAt: Date.now(),
      };
      const next = { ...prev, tournaments: [...prev.tournaments, copy] };
      void storage.save(next);
      return next;
    });
  }, []);

  const deleteTournament = useCallback((id: string) => {
    setLibrary((prev) => {
      if (!prev) return prev;
      const next: TournamentLibrary = {
        tournaments: prev.tournaments.filter((t) => t.id !== id),
        publishedId: prev.publishedId === id ? null : prev.publishedId,
      };
      void storage.save(next);
      return next;
    });
    setActiveId((cur) => (cur === id ? null : cur));
  }, []);

  /** Publish a tournament — automatically replaces any previously published one. */
  const publishTournament = useCallback(
    (id: string) => {
      setLibrary((prev) => {
        if (!prev) return prev;
        const next = { ...prev, publishedId: id };
        void storage.save(next);
        return next;
      });
    },
    [],
  );

  const unpublishTournament = useCallback(() => {
    setLibrary((prev) => {
      if (!prev) return prev;
      const next = { ...prev, publishedId: null };
      void storage.save(next);
      return next;
    });
  }, []);

  const selectTournament = useCallback((id: string) => setActiveId(id), []);
  const backToOverview = useCallback(() => setActiveId(null), []);

  // ── Per-active tournament mutations ────────────────────────────────────────
  const updateTeam = useCallback(
    (slot: SlotId, patch: Partial<Team>) => {
      mutateActive((t) => ({ ...t, teams: { ...t.teams, [slot]: { ...t.teams[slot], ...patch } } }));
    },
    [mutateActive],
  );

  const setGroupLabel = useCallback(
    (group: GroupId, label: string) => {
      mutateActive((t) => {
        const groupLabels = { ...(t.groupLabels ?? {}) };
        if (label.trim()) groupLabels[group] = label;
        else delete groupLabels[group];
        return { ...t, groupLabels };
      });
    },
    [mutateActive],
  );

  const setTournamentDate = useCallback(
    (tournamentDate: string) => mutateActive((t) => ({ ...t, tournamentDate })),
    [mutateActive],
  );

  /** Override a single slot's time (keyed by its base time). Empty → back to plan. */
  const setSlotTime = useCallback(
    (baseTime: string, time: string) =>
      mutateActive((t) => {
        const slotTimes = { ...(t.slotTimes ?? {}) };
        if (time.trim()) slotTimes[baseTime] = time;
        else delete slotTimes[baseTime];
        return { ...t, slotTimes };
      }),
    [mutateActive],
  );

  /** Merge a batch of slot-time overrides (e.g. "reflow remaining from now"). */
  const reflowTimes = useCallback(
    (patch: Record<string, string>) =>
      mutateActive((t) => ({ ...t, slotTimes: { ...(t.slotTimes ?? {}), ...patch } })),
    [mutateActive],
  );

  /** Drop all time overrides — back to the planned schedule. */
  const resetSlotTimes = useCallback(
    () => mutateActive((t) => ({ ...t, slotTimes: {} })),
    [mutateActive],
  );

  const goLive = useCallback(
    () => mutateActive((t) => ({ ...t, tournamentStartedAt: Date.now() })),
    [mutateActive],
  );

  const endLive = useCallback(
    () => mutateActive((t) => ({ ...t, tournamentStartedAt: undefined })),
    [mutateActive],
  );

  const setResult = useCallback(
    (result: MatchResult) =>
      mutateActive((t) => ({ ...t, results: { ...t.results, [result.matchId]: result } })),
    [mutateActive],
  );

  const clearResult = useCallback(
    (matchId: string) =>
      mutateActive((t) => {
        const results = { ...t.results };
        delete results[matchId];
        return { ...t, results };
      }),
    [mutateActive],
  );

  /** Wipe results + timers (keeps config + names), back to the published plan. */
  const resetResults = useCallback(
    () =>
      mutateActive((t) => ({
        ...t,
        results: {},
        startedAt: {},
        liveScores: {},
        liveSets: {},
        tournamentStartedAt: undefined,
      })),
    [mutateActive],
  );

  const startSlot = useCallback(
    (matchIds: string[]) =>
      mutateActive((t) => {
        const now = Date.now();
        const startedAt = { ...(t.startedAt ?? {}) };
        const liveScores = { ...(t.liveScores ?? {}) };
        for (const id of matchIds) {
          startedAt[id] = now;
          liveScores[id] = { home: 0, away: 0 };
        }
        return { ...t, startedAt, liveScores };
      }),
    [mutateActive],
  );

  const clearSlotStart = useCallback(
    (matchIds: string[]) =>
      mutateActive((t) => {
        const startedAt = { ...(t.startedAt ?? {}) };
        const liveScores = { ...(t.liveScores ?? {}) };
        for (const id of matchIds) {
          delete startedAt[id];
          delete liveScores[id];
        }
        return { ...t, startedAt, liveScores };
      }),
    [mutateActive],
  );

  const adjustScore = useCallback(
    (matchId: string, side: 'home' | 'away', delta: number) =>
      mutateActive((t) => {
        const current: SetScore = t.liveScores?.[matchId] ?? { home: 0, away: 0 };
        const updated: SetScore = { ...current, [side]: Math.max(0, current[side] + delta) };
        return { ...t, liveScores: { ...(t.liveScores ?? {}), [matchId]: updated } };
      }),
    [mutateActive],
  );

  const finishMatch = useCallback(
    (matchId: string) =>
      mutateActive((t) => {
        const score = t.liveScores?.[matchId] ?? { home: 0, away: 0 };
        const results = { ...t.results, [matchId]: { matchId, sets: [score] } };
        const liveScores = { ...(t.liveScores ?? {}) };
        delete liveScores[matchId];
        return { ...t, results, liveScores };
      }),
    [mutateActive],
  );

  // ── Live KO (best-of-3 sets, played set by set) ────────────────────────────
  const startKoMatch = useCallback(
    (matchId: string) =>
      mutateActive((t) => ({
        ...t,
        startedAt: { ...(t.startedAt ?? {}), [matchId]: Date.now() },
        // start with just the FIRST set; the next set is added on "Satz beenden".
        liveSets: { ...(t.liveSets ?? {}), [matchId]: [{ home: 0, away: 0 }] },
      })),
    [mutateActive],
  );

  const adjustKoGame = useCallback(
    (matchId: string, setIndex: number, side: 'home' | 'away', delta: number) =>
      mutateActive((t) => {
        const sets = (t.liveSets?.[matchId] ?? []).map((s) => ({ ...s }));
        if (!sets[setIndex]) return t;
        sets[setIndex][side] = Math.max(0, sets[setIndex][side] + delta);
        return { ...t, liveSets: { ...(t.liveSets ?? {}), [matchId]: sets } };
      }),
    [mutateActive],
  );

  /** Confirm the current set and open the next one (the 3rd is the tie-break). */
  const endKoSet = useCallback(
    (matchId: string) =>
      mutateActive((t) => {
        const sets = (t.liveSets?.[matchId] ?? []).map((s) => ({ ...s }));
        if (sets.length >= 3) return t; // best-of-3: no 4th set
        sets.push({ home: 0, away: 0 });
        return { ...t, liveSets: { ...(t.liveSets ?? {}), [matchId]: sets } };
      }),
    [mutateActive],
  );

  /** Undo the last "Satz beenden" (drop the freshly opened, still-empty set). */
  const undoKoSet = useCallback(
    (matchId: string) =>
      mutateActive((t) => {
        const sets = (t.liveSets?.[matchId] ?? []).map((s) => ({ ...s }));
        if (sets.length <= 1) return t;
        const last = sets[sets.length - 1];
        if (last.home === 0 && last.away === 0) sets.pop();
        return { ...t, liveSets: { ...(t.liveSets ?? {}), [matchId]: sets } };
      }),
    [mutateActive],
  );

  const finishKoMatch = useCallback(
    (matchId: string) =>
      mutateActive((t) => {
        const sets = (t.liveSets?.[matchId] ?? []).filter((s) => s.home || s.away);
        const results = { ...t.results, [matchId]: { matchId, sets } };
        const liveSets = { ...(t.liveSets ?? {}) };
        delete liveSets[matchId];
        return { ...t, results, liveSets };
      }),
    [mutateActive],
  );

  const clearKoMatch = useCallback(
    (matchId: string) =>
      mutateActive((t) => {
        const startedAt = { ...(t.startedAt ?? {}) };
        const liveSets = { ...(t.liveSets ?? {}) };
        delete startedAt[matchId];
        delete liveSets[matchId];
        return { ...t, startedAt, liveSets };
      }),
    [mutateActive],
  );

  const reopenMatch = useCallback(
    (matchId: string) =>
      mutateActive((t) => {
        const score = t.results[matchId]?.sets[0] ?? { home: 0, away: 0 };
        const results = { ...t.results };
        delete results[matchId];
        const startedAt = { ...(t.startedAt ?? {}), [matchId]: t.startedAt?.[matchId] ?? Date.now() };
        const liveScores = { ...(t.liveScores ?? {}), [matchId]: score };
        return { ...t, results, startedAt, liveScores };
      }),
    [mutateActive],
  );

  // ── Derived ────────────────────────────────────────────────────────────────
  const active = useMemo(
    () => library?.tournaments.find((t) => t.id === activeId) ?? null,
    [library, activeId],
  );
  const scenario = useMemo(
    () =>
      active
        ? deriveScenario(active.scenarioId, active.tournamentDate, active.groupLabels, active.slotTimes)
        : undefined,
    [active?.scenarioId, active?.tournamentDate, active?.groupLabels, active?.slotTimes], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const publishedId = library?.publishedId ?? null;

  return {
    loaded,
    library,
    activeId,
    active,
    scenario,
    publishedId,
    phase: phaseOf(active, publishedId),
    actions: {
      createTournament,
      renameTournament,
      duplicateTournament,
      deleteTournament,
      publishTournament,
      unpublishTournament,
      selectTournament,
      backToOverview,
      updateTeam,
      setGroupLabel,
      setTournamentDate,
      setSlotTime,
      reflowTimes,
      resetSlotTimes,
      goLive,
      endLive,
      setResult,
      clearResult,
      resetResults,
      startSlot,
      clearSlotStart,
      adjustScore,
      finishMatch,
      reopenMatch,
      startKoMatch,
      adjustKoGame,
      endKoSet,
      undoKoSet,
      finishKoMatch,
      clearKoMatch,
    },
  };
}

// ============================================================================
//  Public hook — read-only view of the single published tournament.
// ============================================================================
export function usePublishedTournament() {
  const [library, setLibrary] = useState<TournamentLibrary | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    storage.load().then((lib) => {
      if (!alive) return;
      setLibrary(lib);
      setLoaded(true);
    });
    const unsub = storage.subscribe((lib) => setLibrary(lib));
    return () => {
      alive = false;
      unsub();
    };
  }, []);

  const tournament = useMemo(
    () => library?.tournaments.find((t) => t.id === library.publishedId) ?? null,
    [library],
  );
  const scenario = useMemo(
    () =>
      tournament
        ? deriveScenario(
            tournament.scenarioId,
            tournament.tournamentDate,
            tournament.groupLabels,
            tournament.slotTimes,
          )
        : undefined,
    [tournament?.scenarioId, tournament?.tournamentDate, tournament?.groupLabels, tournament?.slotTimes], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return {
    loaded,
    tournament,
    scenario,
    phase: phaseOf(tournament, library?.publishedId ?? null),
  };
}
