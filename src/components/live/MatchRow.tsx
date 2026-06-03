import { useState } from 'react';
import type { MatchFormat, MatchResult } from '../../types';
import { evaluateMatch } from '../../lib/match';
import ResultEditor from './ResultEditor';

interface Props {
  matchId: string;
  time: string;
  court: 1 | 2;
  meta?: string; // e.g. group label or KO stage label
  format: MatchFormat;
  homeLabel: string;
  awayLabel: string;
  homeReady?: boolean; // KO: are both teams resolved yet?
  awayReady?: boolean;
  result?: MatchResult;
  editable: boolean;
  onSave?: (r: MatchResult) => void;
  onClear?: (matchId: string) => void;
}

export default function MatchRow({
  matchId,
  time,
  court,
  meta,
  format,
  homeLabel,
  awayLabel,
  result,
  editable,
  onSave,
  onClear,
}: Props) {
  const [editing, setEditing] = useState(false);
  const outcome = evaluateMatch(result, format);

  const scoreText = result
    ? result.sets.map((s) => `${s.home}–${s.away}`).join('  ')
    : '';

  const homeWon = outcome.winner === 'home';
  const awayWon = outcome.winner === 'away';

  return (
    <div className="rounded-xl border border-ink/10 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-md bg-ink px-2 py-0.5 font-display font-semibold tracking-wide text-paper">
            {time}
          </span>
          <span className="rounded-md bg-court/10 px-2 py-0.5 font-display font-semibold uppercase tracking-wide text-court">
            Platz {court}
          </span>
          {meta && <span className="font-display uppercase tracking-wide text-muted">{meta}</span>}
        </div>
        {outcome.complete && (
          <span className="font-display text-xs font-semibold uppercase tracking-wide text-court">
            fertig
          </span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-2">
        <div className="min-w-0">
          <p className={`truncate text-lg ${homeWon ? 'font-bold text-ink' : 'text-ink/80'}`}>
            {homeLabel}
          </p>
          <p className={`truncate text-lg ${awayWon ? 'font-bold text-ink' : 'text-ink/80'}`}>
            {awayLabel}
          </p>
        </div>
        <div className="text-right font-display text-xl font-bold tabular-nums">
          {result ? (
            <div className="flex flex-col items-end leading-tight">
              <span className={homeWon ? 'text-court' : 'text-muted'}>
                {result.sets.map((s) => s.home).join(' ')}
              </span>
              <span className={awayWon ? 'text-court' : 'text-muted'}>
                {result.sets.map((s) => s.away).join(' ')}
              </span>
            </div>
          ) : (
            <span className="text-sm font-normal text-muted">offen</span>
          )}
        </div>
      </div>

      {editable && (
        <div className="mt-3">
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="rounded-full border border-ink/15 px-4 py-1.5 font-display text-sm font-semibold uppercase tracking-wide text-court transition-colors hover:border-court hover:bg-court hover:text-paper cursor-pointer"
            >
              {result ? 'Ergebnis bearbeiten' : 'Ergebnis eintragen'}
            </button>
          ) : (
            <ResultEditor
              matchId={matchId}
              format={format}
              homeLabel={homeLabel}
              awayLabel={awayLabel}
              current={result}
              onSave={(r) => onSave?.(r)}
              onClear={() => onClear?.(matchId)}
              onClose={() => setEditing(false)}
            />
          )}
        </div>
      )}

      {/* visually hidden full score for screen readers / tie-break clarity */}
      {result && <span className="sr-only">Ergebnis: {scoreText}</span>}
    </div>
  );
}
