import { useState } from 'react';
import type { MatchFormat, MatchResult, SetScore } from '../../types';
import { maxSets } from '../../lib/display';

interface Props {
  matchId: string;
  format: MatchFormat;
  homeLabel: string;
  awayLabel: string;
  current?: MatchResult;
  onSave: (result: MatchResult) => void;
  onClear: () => void;
  onClose: () => void;
}

/** Inline score entry. Single game for americano/short set, up to N sets for Bo3. */
export default function ResultEditor({
  matchId,
  format,
  homeLabel,
  awayLabel,
  current,
  onSave,
  onClear,
  onClose,
}: Props) {
  const rows = maxSets(format);
  const init = (i: number, side: 'home' | 'away') => {
    const v = current?.sets[i]?.[side];
    return v === undefined ? '' : String(v);
  };
  // local string state per cell so inputs can be cleared while typing
  const [cells, setCells] = useState<string[][]>(
    Array.from({ length: rows }, (_, i) => [init(i, 'home'), init(i, 'away')]),
  );

  const setCell = (row: number, col: 0 | 1, value: string) => {
    const v = value.replace(/[^0-9]/g, '').slice(0, 2);
    setCells((prev) =>
      prev.map((r, ri) => {
        if (ri !== row) return r;
        const next: [string, string] = [r[0], r[1]];
        next[col] = v;
        return next;
      }),
    );
  };

  const save = () => {
    const sets: SetScore[] = [];
    cells.forEach(([h, a]) => {
      if (h === '' && a === '') return;
      sets.push({ home: Number(h || 0), away: Number(a || 0) });
    });
    if (sets.length === 0) {
      onClear();
      onClose();
      return;
    }
    const result: MatchResult = { matchId, sets };
    // Only mark the 3rd set as a match tie-break for formats that actually use one.
    if (format.type === 'bestOfSets' && format.tieBreakTarget && sets.length === 3)
      result.thirdSetIsTieBreak = true;
    onSave(result);
    onClose();
  };

  const isSets = format.type === 'bestOfSets';

  return (
    <div className="mt-3 rounded-xl border border-ink/10 bg-paper p-4">
      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 gap-y-2 text-sm">
        <span className="font-semibold">{homeLabel}</span>
        <span className="col-start-2 text-center font-display text-xs uppercase tracking-wide text-muted">
          {isSets ? 'Sätze →' : 'Punkte'}
        </span>
        <span />

        {cells.map((row, i) => (
          <ScoreRow
            key={i}
            label={isSets ? (i === 2 && format.tieBreakTarget ? 'Satz 3 / MTB' : `Satz ${i + 1}`) : ''}
            home={row[0]}
            away={row[1]}
            onHome={(v) => setCell(i, 0, v)}
            onAway={(v) => setCell(i, 1, v)}
            ariaHome={`${homeLabel} ${isSets ? `Satz ${i + 1}` : 'Punkte'}`}
            ariaAway={`${awayLabel} ${isSets ? `Satz ${i + 1}` : 'Punkte'}`}
          />
        ))}
        <span className="font-semibold">{awayLabel}</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={save} className="btn-accent !py-2 !text-base">
          Speichern
        </button>
        <button
          onClick={() => {
            onClear();
            onClose();
          }}
          className="rounded-full border border-ink/15 px-5 py-2 font-display text-base font-semibold uppercase tracking-wide text-muted transition-colors hover:border-red-400 hover:text-red-600 cursor-pointer"
        >
          Löschen
        </button>
        <button
          onClick={onClose}
          className="rounded-full px-5 py-2 font-display text-base font-semibold uppercase tracking-wide text-muted transition-colors hover:text-ink cursor-pointer"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}

function ScoreRow({
  label,
  home,
  away,
  onHome,
  onAway,
  ariaHome,
  ariaAway,
}: {
  label: string;
  home: string;
  away: string;
  onHome: (v: string) => void;
  onAway: (v: string) => void;
  ariaHome: string;
  ariaAway: string;
}) {
  return (
    <>
      {label ? (
        <span className="col-span-3 mt-1 font-display text-xs uppercase tracking-wide text-muted">
          {label}
        </span>
      ) : null}
      <div className="col-span-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <input
          inputMode="numeric"
          aria-label={ariaHome}
          value={home}
          onChange={(e) => onHome(e.target.value)}
          className="w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-center text-lg font-bold outline-none focus:border-court"
        />
        <span className="text-muted">:</span>
        <input
          inputMode="numeric"
          aria-label={ariaAway}
          value={away}
          onChange={(e) => onAway(e.target.value)}
          className="w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-center text-lg font-bold outline-none focus:border-court"
        />
      </div>
    </>
  );
}
