// ============================================================================
//  Live status of a match — pure & testable.
//
//  The flow is explicit-start driven:
//    • 'done'     once a FINAL result exists,
//    • 'live'     once the match has been started and not yet finalised,
//    • 'upcoming' otherwise (not started, no result).
// ============================================================================

export type LiveStatus = 'done' | 'live' | 'upcoming';

export function matchStatus(hasResult: boolean, started: boolean): LiveStatus {
  if (hasResult) return 'done';
  if (started) return 'live';
  return 'upcoming';
}

// ── Countdown timer ──────────────────────────────────────────────────────────
/** Seconds left on a match's timer; negative once overrun (clamped at display). */
export function remainingSeconds(
  startedAt: number,
  durationMin: number,
  nowMs: number,
): number {
  return durationMin * 60 - Math.floor((nowMs - startedAt) / 1000);
}

/** Format seconds as M:SS (or -M:SS when overrun). */
export function formatMMSS(totalSeconds: number): string {
  const neg = totalSeconds < 0;
  const s = Math.abs(totalSeconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${neg ? '-' : ''}${m}:${String(sec).padStart(2, '0')}`;
}
