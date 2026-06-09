// ============================================================================
//  Domain types for the Hermanos de Padel tournament app.
//
//  Two layers:
//   1. SCENARIO layer — static tournament definitions (scenarios.ts). These
//      describe the *shape* of a tournament: groups, schedule, KO format,
//      qualification rules. They use abstract slot IDs ("G1.1") not real names.
//   2. STATE layer — the live, persisted tournament (one chosen scenario +
//      team names + entered results). This is what lives in storage.
// ============================================================================

// ── Identifiers ─────────────────────────────────────────────────────────────
export type CourtId = 1 | 2;
export type GroupId = string; // e.g. "G1"
/** Abstract team position inside a scenario, before real names are assigned. */
export type SlotId = string; // e.g. "G1.1"

export type KoStage = 'QF' | 'SF' | 'F' | 'P3' | 'BONUS';

// ── Match format ─────────────────────────────────────────────────────────────
/**
 * Describes how a match is scored / won.
 *  - `americano`  : a single game, score = points scored, Golden Point.
 *  - `shortSet`   : one set to `setTarget` games (e.g. 4), Golden Point.
 *  - `bestOfSets` : best-of-`sets` sets to `setTarget` games; at 1–1 sets a
 *                   match tie-break to `tieBreakTarget` (e.g. 7) decides it.
 */
export interface MatchFormat {
  type: 'americano' | 'shortSet' | 'bestOfSets';
  goldenPoint: boolean;
  sets?: number; // bestOfSets: total sets (3 → best of 3)
  setTarget?: number; // games needed to win a set (4 or 6)
  tieBreakTarget?: number; // match tie-break target at 1–1 (e.g. 7)
}

// ── Scenario: schedule definitions ───────────────────────────────────────────
export interface GroupDef {
  id: GroupId;
  label: string; // "Gruppe 1"
  slots: SlotId[]; // ["G1.1", "G1.2", "G1.3", "G1.4"]
}

export interface GroupMatchDef {
  id: string; // stable unique id, e.g. "G-1110-P1"
  kind: 'group';
  time: string; // effective clock time, "11:10" (after start-shift + overrides)
  /** original, unshifted scenario time — the stable key for time overrides. */
  baseTime?: string;
  court: CourtId;
  group: GroupId;
  home: SlotId;
  away: SlotId;
  format: MatchFormat;
}

/** A reference that resolves to a real team once results are known. */
export type SlotRef =
  | { type: 'seed'; seed: number } // 1-based seed from qualification ranking
  | { type: 'winner'; matchId: string } // winner of an earlier KO match
  | { type: 'loser'; matchId: string } // loser of an earlier KO match (→ P3)
  | { type: 'eliminated'; rank: number }; // Nth-best group-phase non-qualifier (bonus round)

export interface KoMatchDef {
  id: string;
  kind: 'ko';
  stage: KoStage;
  label: string; // "Halbfinale 1", "Finale", "Spiel um Platz 3"
  time: string;
  /** original, unshifted scenario time — the stable key for time overrides. */
  baseTime?: string;
  court: CourtId;
  home: SlotRef;
  away: SlotRef;
  format: MatchFormat;
}

export type MatchDef = GroupMatchDef | KoMatchDef;

// ── Qualification configuration ──────────────────────────────────────────────
/**
 * How many teams advance and from where. The qualification logic (qualification.ts)
 * reads this to produce a seeded list of qualifiers that fills the KO seeds.
 *  - `topPerGroup`   : take the best N from every group.
 *  - `bestRunnersUp` : additionally take the best M teams across all teams that
 *                      finished in position `bestRunnersUpRank` in their group
 *                      (e.g. best 2nd-placed, or best 3rd-placed).
 */
export interface QualificationConfig {
  topPerGroup: number;
  bestRunnersUp?: number;
  bestRunnersUpRank?: number; // group rank the wildcards come from (2 = 2nd, 3 = 3rd)
  qualifierCount: number; // total teams entering the KO (4 or 8)
}

// ── Scenario ─────────────────────────────────────────────────────────────────
export interface Scenario {
  id: number; // 1..6
  name: string; // "16 Teams · Top 4"
  description: string;
  teamCount: number;
  groups: GroupDef[];
  groupMatchDurationMin: number;
  /** timer length (minutes) for a live KO match (QF/SF/Final). */
  koMatchDurationMin: number;
  qualification: QualificationConfig;
  groupSchedule: GroupMatchDef[];
  koSchedule: KoMatchDef[];
  endTime: string; // "15:42"
  koSummary: string; // human-readable KO format note
}

// ============================================================================
//  STATE layer — the live persisted tournament
// ============================================================================
export interface Team {
  id: SlotId; // matches the scenario slot it occupies
  name: string; // editable team name
  player1: string;
  player2: string;
  group: GroupId;
}

/** A single set's game score, e.g. { home: 6, away: 4 }. */
export interface SetScore {
  home: number;
  away: number;
}

/**
 * A result entered for a match.
 *  - group / shortSet matches use a single SetScore in `sets[0]`.
 *  - bestOfSets matches use up to 3 entries; the 3rd may be the match tie-break.
 */
export interface MatchResult {
  matchId: string;
  sets: SetScore[];
  /** marks sets[2] as a match tie-break (counts as one set won, not games). */
  thirdSetIsTieBreak?: boolean;
}

export interface TournamentState {
  scenarioId: number;
  teams: Record<SlotId, Team>;
  /** optional custom group labels, keyed by GroupId. Falls back to the scenario
   *  default ("Gruppe 1") when absent/empty. */
  groupLabels?: Record<GroupId, string>;
  /** optional per-slot time overrides, keyed by the slot's BASE time ("11:10")
   *  → effective clock time ("11:28"). Lets the admin pull games forward / reflow
   *  the remaining plan when things run early or late. */
  slotTimes?: Record<string, string>;
  results: Record<string, MatchResult>; // keyed by matchId — FINAL results only
  /** epoch ms when a match was started (timer). Both courts of a slot share it. */
  startedAt?: Record<string, number>;
  /** in-progress live score (per matchId) while a single-game match is active,
   *  before it is finalised into `results`. Group/americano + bonus matches. */
  liveScores?: Record<string, SetScore>;
  /** in-progress live SETS for an active multi-set KO match (best-of-3). */
  liveSets?: Record<string, SetScore[]>;
  createdAt: number;
  /** false until the basics step (scenario + date) is confirmed. */
  setupComplete: boolean;
  /** scheduled day + first-match start time, datetime-local string
   *  ("2026-07-05T11:10"). The whole plan is shifted so the first group match
   *  lands on this clock time. */
  tournamentDate?: string;
  /** epoch ms when the admin went LIVE: scoring + the time-aware "next / due"
   *  detection are active. Only meaningful for the published tournament. */
  tournamentStartedAt?: number;
}

/**
 * A saved tournament inside the library — a TournamentState plus identity.
 * Whether it is *public* is decided by the library's `publishedId`, never by a
 * per-tournament flag, so only ever ONE tournament is published at a time.
 */
export interface Tournament extends TournamentState {
  id: string;
  title: string;
}

/** The whole admin library: many tournaments, at most one published. */
export interface TournamentLibrary {
  tournaments: Tournament[];
  publishedId: string | null;
}

/** Lifecycle phase derived from the flags + library publish pointer. */
export type TournamentPhase = 'setup' | 'ready' | 'published' | 'live';

// ── Derived / computed types (not persisted) ─────────────────────────────────
/** One row of a group's live standings table. */
export interface Standing {
  teamId: SlotId;
  rank: number;
  played: number;
  won: number;
  lost: number;
  pointsFor: number; // games/points scored
  pointsAgainst: number;
  diff: number; // pointsFor - pointsAgainst
  matchPoints: number; // 2 per win, 1 per draw, 0 per loss (Americano win count)
}
