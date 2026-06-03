// Small presentation helpers shared across the dashboard + read-only view.
import type { MatchFormat, SlotId, Team } from '../types';

/** Resolve a team's display name, with a fallback for empty KO slots. */
export function teamName(
  teams: Record<SlotId, Team>,
  slot: SlotId | null,
  fallback = '—',
): string {
  if (!slot) return fallback;
  return teams[slot]?.name || slot;
}

/** Short human label for a match format. */
export function formatLabel(format: MatchFormat): string {
  switch (format.type) {
    case 'americano':
      return 'Punkte (Golden Point)';
    case 'shortSet':
      return `Kurzsatz bis ${format.setTarget}`;
    case 'bestOfSets':
      return `Best-of-${format.sets} bis ${format.setTarget} · MTB ${format.tieBreakTarget}`;
  }
}

/** How many set inputs to show for a format (group/short = 1, bo3 = up to 3). */
export function maxSets(format: MatchFormat): number {
  return format.type === 'bestOfSets' ? format.sets ?? 3 : 1;
}
