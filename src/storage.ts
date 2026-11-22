// localStorage wrapper. Every access is in try/catch: private mode, blocked storage or
// corrupted data must never break the game. It just won't remember anything.

import { emptyStats, type Stats } from './stats.ts';

const KEY = 'aimldle:v1';

export interface SavedState {
  /** Guessed term ids, in order, per puzzle number (today's puzzle and any archive puzzles played). */
  games: Record<string, string[]>;
  /** Revealed hint traits (column keys), in order, per puzzle number. */
  hints: Record<string, string[]>;
  /** Puzzle numbers the player gave up on. */
  gaveUp: number[];
  /** Stats count daily puzzles only (archive plays don't affect them). */
  stats: Stats;
  /** Whether the "how to play" dialog has been shown once. */
  seenHelp: boolean;
}

export function defaultState(): SavedState {
  return { games: {}, hints: {}, gaveUp: [], stats: emptyStats(), seenHelp: false };
}

const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');

/** Turns stored JSON into a valid state, dropping anything malformed. Pure, so it's testable. */
export function parseState(raw: string | null): SavedState {
  const state = defaultState();
  if (!raw) return state;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed.stats && typeof parsed.stats === 'object') state.stats = { ...emptyStats(), ...(parsed.stats as Stats) };
    state.seenHelp = parsed.seenHelp === true;
    if (Array.isArray(parsed.gaveUp)) state.gaveUp = parsed.gaveUp.filter((n): n is number => Number.isInteger(n));
    for (const field of ['games', 'hints'] as const) {
      const value = parsed[field];
      if (!value || typeof value !== 'object') continue;
      for (const [puzzle, list] of Object.entries(value as Record<string, unknown>)) {
        if (isStringArray(list)) state[field][puzzle] = list;
      }
    }
    // Older format: one { puzzle, guesses } pair for "today" only.
    if (typeof parsed.puzzle === 'number' && isStringArray(parsed.guesses) && !state.games[parsed.puzzle]) {
      state.games[parsed.puzzle] = parsed.guesses;
    }
  } catch {
    return defaultState();
  }
  return state;
}

export function loadState(): SavedState {
  try {
    return parseState(localStorage.getItem(KEY));
  } catch {
    return defaultState();
  }
}

const SESSION_KEY = 'aimldle:dev-session';

/** Dev only: wipe saved progress if the dev server was restarted since the last visit. */
export function resetIfNewDevSession(sessionId: string): void {
  try {
    if (localStorage.getItem(SESSION_KEY) !== sessionId) {
      localStorage.removeItem(KEY);
      localStorage.setItem(SESSION_KEY, sessionId);
    }
  } catch {
    // Storage unavailable: nothing to reset.
  }
}

export function saveState(state: SavedState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable or full: keep playing without saving.
  }
}
