import type { SetScore } from '../../types';

interface Props {
  home: string;
  away: string;
  sets: SetScore[];
  homeSetsWon: number;
  awaySetsWon: number;
  /** index of the set currently being played (gets a ring) — omit for finished. */
  activeIndex?: number;
  /** index of the set that is the match tie-break (labelled "TB"). */
  tieBreakIndex?: number;
  winner?: 'home' | 'away' | null;
  variant?: 'light' | 'dark';
}

/**
 * Tennis-style scoreboard: each team on a row, the set games in columns, the
 * sets-won shown big up front. The live set is ringed; the tie-break column is
 * marked "TB". Used by the admin scorer, the public live card and the KO tree.
 */
export default function SetScoreboard({
  home,
  away,
  sets,
  homeSetsWon,
  awaySetsWon,
  activeIndex,
  tieBreakIndex,
  winner,
  variant = 'dark',
}: Props) {
  const cols = Math.max(sets.length, 1);
  const c =
    variant === 'dark'
      ? {
          name: 'text-paper/85',
          nameWin: 'font-bold text-paper',
          head: 'text-paper/45',
          big: 'text-accent',
          cell: 'bg-black/20 text-paper/80',
          cellActive: 'bg-black/30 text-paper ring-2 ring-accent',
        }
      : {
          name: 'text-ink/85',
          nameWin: 'font-bold text-ink',
          head: 'text-muted',
          big: 'text-court',
          cell: 'bg-paper text-ink/80',
          cellActive: 'bg-paper text-ink ring-2 ring-court',
        };

  const Row = ({ name, games, setsWon, win }: { name: string; games: number[]; setsWon: number; win: boolean }) => (
    <div className="flex items-center gap-3">
      <span className={`min-w-0 flex-1 truncate text-lg ${win ? c.nameWin : c.name}`}>{name}</span>
      <span className={`w-6 text-center font-display text-2xl font-bold tabular-nums ${c.big}`}>
        {setsWon}
      </span>
      <div className="flex gap-1.5">
        {Array.from({ length: cols }).map((_, i) => (
          <span
            key={i}
            className={`flex h-9 w-9 items-center justify-center rounded-lg font-display text-lg font-bold tabular-nums ${
              i === activeIndex ? c.cellActive : c.cell
            }`}
          >
            {games[i] ?? ''}
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-2">
      {/* column headers */}
      <div className="flex items-center gap-3">
        <span className="flex-1" />
        <span className={`w-6 text-center font-display text-[0.6rem] uppercase tracking-wide ${c.head}`}>
          Sätze
        </span>
        <div className="flex gap-1.5">
          {Array.from({ length: cols }).map((_, i) => (
            <span
              key={i}
              className={`w-9 text-center font-display text-[0.6rem] uppercase tracking-wide ${c.head}`}
            >
              {i === tieBreakIndex ? 'TB' : i + 1}
            </span>
          ))}
        </div>
      </div>
      <Row name={home} games={sets.map((s) => s.home)} setsWon={homeSetsWon} win={winner === 'home'} />
      <Row name={away} games={sets.map((s) => s.away)} setsWon={awaySetsWon} win={winner === 'away'} />
    </div>
  );
}
