import { useTicker } from '../hooks/useTicker';

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** ms remaining (clamped at 0). */
  remaining: number;
  /** true once the target time has been reached. */
  done: boolean;
}

/**
 * Live countdown to a target time. `target` is a datetime-local string
 * ("2026-07-05T11:10") or any Date-parseable string. Re-renders every second.
 * Returns null when no valid target is given.
 */
export function useCountdown(target?: string): CountdownParts | null {
  const now = useTicker(1000);
  if (!target) return null;
  const ts = new Date(target).getTime();
  if (Number.isNaN(ts)) return null;

  const remaining = Math.max(0, ts - now);
  const totalSec = Math.floor(remaining / 1000);
  return {
    days: Math.floor(totalSec / 86400),
    hours: Math.floor((totalSec % 86400) / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
    remaining,
    done: remaining <= 0,
  };
}

/** Large countdown display for the public "beamer" view. */
export function Countdown({ parts }: { parts: CountdownParts }) {
  const cells: Array<{ label: string; value: number }> = [
    { label: 'Tage', value: parts.days },
    { label: 'Std', value: parts.hours },
    { label: 'Min', value: parts.minutes },
    { label: 'Sek', value: parts.seconds },
  ];
  return (
    <div className="flex items-stretch justify-center gap-3 sm:gap-4">
      {cells.map((c) => (
        <div
          key={c.label}
          className="flex min-w-[4.5rem] flex-col items-center rounded-2xl bg-paper/10 px-4 py-4 sm:min-w-[6rem] sm:px-6 sm:py-6"
        >
          <span className="font-display text-4xl font-bold tabular-nums sm:text-6xl">
            {String(c.value).padStart(2, '0')}
          </span>
          <span className="mt-1 font-display text-[0.6rem] uppercase tracking-[0.2em] text-paper/60 sm:text-xs">
            {c.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Format a datetime-local string as a readable German date + time. */
export function formatTournamentDate(target?: string): string | null {
  if (!target) return null;
  const d = new Date(target);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
