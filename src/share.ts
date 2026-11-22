import type { TileState } from './compare.ts';

export const SHARE_EMOJI: Record<TileState, string> = {
  correct: '🟩',
  partial: '🟧',
  wrong: '🟥',
  higher: '⬆️',
  lower: '⬇️',
  // Close years show as orange in the share grid (direction isn't needed to stay spoiler-free).
  'higher-close': '🟧',
  'lower-close': '🟧',
};

export interface ShareOptions {
  /** Number of hints used. */
  hints?: number;
  /** The player gave up instead of solving it. */
  gaveUp?: boolean;
  /** Long games show only the last rows, so the text stays short enough to paste anywhere. */
  maxRows?: number;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : word.endsWith('s') ? 'es' : 's'}`;

/** Spoiler-free result text. `rows` are the guesses in the order they were made. */
export function buildShareText(
  puzzle: number,
  rows: readonly (readonly TileState[])[],
  url: string,
  { hints = 0, gaveUp = false, maxRows = 6 }: ShareOptions = {},
): string {
  const count = rows.length;
  const hintText = hints ? ` + ${plural(hints, 'hint')}` : '';
  const outcome = gaveUp ? `gave up after ${plural(count, 'guess')}` : `solved in ${plural(count, 'guess')}`;
  const header = `AIMLdle #${puzzle}: ${outcome}${hintText}`;
  const shown = rows.slice(-maxRows).map((row) => row.map((s) => SHARE_EMOJI[s]).join(''));
  const hidden = count - shown.length;
  const lines = [header, ...(hidden > 0 ? [`…${hidden} more`] : []), ...shown, url];
  return lines.join('\n');
}
