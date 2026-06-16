// ============================================================================
//  Schedule generation — pure, deterministic, testable.
//
//  Produces the group-phase match plan for a scenario from its group layout.
//  The algorithm is verified against the exact, hand-given Scenario 1 plan in
//  schedule.test.ts, so the other scenarios are generated "analog" with
//  confidence (as the brief requests).
// ============================================================================

import type { CourtId, GroupDef, GroupMatchDef, MatchFormat, SlotId } from '../types';

// ── Time helpers ─────────────────────────────────────────────────────────────
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function addMinutes(t: string, delta: number): string {
  return minutesToTime(timeToMinutes(t) + delta);
}

// ── Round-robin (circle method) ──────────────────────────────────────────────
/**
 * Returns the rounds of a single round-robin over `players`. Each round is a
 * list of [home, away] pairs that can be played simultaneously. For an odd
 * number of players one team sits out each round (handled by a BYE that is
 * filtered out). The ordering matches the classic "circle" rotation, which is
 * what the hand-authored Scenario 1 plan uses.
 */
export function roundRobinRounds<T>(players: T[]): Array<Array<[T, T]>> {
  const list = [...players];
  const BYE = Symbol('bye') as unknown as T;
  if (list.length % 2 !== 0) list.push(BYE);

  const n = list.length;
  const rounds: Array<Array<[T, T]>> = [];

  for (let r = 0; r < n - 1; r++) {
    const pairs: Array<[T, T]> = [];
    for (let i = 0; i < n / 2; i++) {
      const a = list[i];
      const b = list[n - 1 - i];
      if (a !== BYE && b !== BYE) pairs.push([a, b]);
    }
    rounds.push(pairs);
    // rotate: keep first fixed, move the rest clockwise.
    list.splice(1, 0, list.pop() as T);
  }
  return rounds;
}

/** Flattened, ordered match list for one group (round 1 matches, then round 2…). */
export function groupMatchOrder(slots: SlotId[]): Array<[SlotId, SlotId]> {
  return roundRobinRounds(slots).flat();
}

// ── Full group-phase scheduling ──────────────────────────────────────────────
/**
 * Assigns every group's round-robin matches to time slots across the 2 courts.
 *
 * Strategy ("verzahnt"): cycle through the groups (G1, G2, G3, …) taking one
 * match from each per pass, and lay the resulting flat sequence into slots two
 * at a time — even index → court 1, odd index → court 2, time advancing by
 * `matchDuration + gap` every two matches. Groups thus rotate across BOTH
 * courts and no team plays back-to-back.
 *
 * This single rule reproduces the two hand-authored reference plans exactly:
 * Scenario 1 (4 groups) and Scenario 6 (3 groups) — both verified in
 * schedule.test.ts. Uneven group sizes (e.g. 4+4+3+3) are handled naturally:
 * an exhausted group is simply skipped on later passes.
 */
export function buildGroupSchedule(
  groups: GroupDef[],
  startTime: string,
  matchDuration: number,
  format: MatchFormat,
  gap = 3,
  slotPlan?: Array<[string, string]>,
): GroupMatchDef[] {
  const slotStep = matchDuration + gap;

  // ── Variant B: explicit per-slot plan ───────────────────────────────────────
  // `slotPlan[i] = [court1Group, court2Group]` — each entry pulls that group's
  // NEXT round-robin match. A slot can be one group on both courts (a full round)
  // or two different groups in parallel. As long as a team's matches never land
  // in adjacent slots, nobody plays back-to-back.
  if (slotPlan && slotPlan.length) {
    const queues = new Map(groups.map((g) => [g.id, groupMatchOrder(g.slots)]));
    const cursor = new Map<string, number>(groups.map((g) => [g.id, 0]));
    const out: GroupMatchDef[] = [];
    slotPlan.forEach((courtsGroups, slotIdx) => {
      const time = addMinutes(startTime, slotIdx * slotStep);
      courtsGroups.forEach((groupId, courtIdx) => {
        if (!groupId) return;
        const idx = cursor.get(groupId) ?? 0;
        const pair = queues.get(groupId)?.[idx];
        if (!pair) return;
        cursor.set(groupId, idx + 1);
        const court = (courtIdx === 0 ? 1 : 2) as CourtId;
        out.push({
          id: `G-${time.replace(':', '')}-P${court}`,
          kind: 'group',
          time,
          court,
          group: groupId,
          home: pair[0],
          away: pair[1],
          format,
        });
      });
    });
    return out;
  }

  // Per-group ordered match queues (circle-method order).
  const queues = groups.map((g) => ({ id: g.id, matches: groupMatchOrder(g.slots) }));

  // Global interleave: one match from each group per pass, in group order.
  const ordered: Array<{ group: string; home: SlotId; away: SlotId }> = [];
  let remaining = true;
  while (remaining) {
    remaining = false;
    for (const q of queues) {
      const next = q.matches.shift();
      if (!next) continue;
      remaining = true;
      ordered.push({ group: q.id, home: next[0], away: next[1] });
    }
  }

  // Lay sequentially into slots: 2 matches per time, court 1 then court 2.
  return ordered.map((m, idx) => {
    const court = (idx % 2 === 0 ? 1 : 2) as CourtId;
    const time = addMinutes(startTime, Math.floor(idx / 2) * slotStep);
    return {
      id: `G-${time.replace(':', '')}-P${court}`,
      kind: 'group',
      time,
      court,
      group: m.group,
      home: m.home,
      away: m.away,
      format,
    };
  });
}
