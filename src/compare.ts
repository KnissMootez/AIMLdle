import { COLUMNS, DIFFICULTIES, type Column, type Difficulty, type Term } from './attributes.ts';

/**
 * correct = exact match, partial = some overlap (multi-value only), wrong = no match,
 * higher / lower = the ANSWER is higher / lower than the guess (number and ordinal columns).
 */
export type TileState = 'correct' | 'partial' | 'wrong' | 'higher' | 'lower';

export interface Tile {
  column: Column;
  /** Text shown on the tile: the guessed term's value. */
  text: string;
  state: TileState;
}

export function compareSingle(guess: string, answer: string): TileState {
  return guess === answer ? 'correct' : 'wrong';
}

export function compareMulti(guess: readonly string[], answer: readonly string[]): TileState {
  const answerSet = new Set(answer);
  const shared = guess.filter((v) => answerSet.has(v)).length;
  const sameSet = shared === answerSet.size && new Set(guess).size === answerSet.size;
  if (sameSet) return 'correct';
  return shared > 0 ? 'partial' : 'wrong';
}

export function compareNumber(guess: number, answer: number): TileState {
  if (guess === answer) return 'correct';
  return answer > guess ? 'higher' : 'lower';
}

export function compareDifficulty(guess: Difficulty, answer: Difficulty): TileState {
  return compareNumber(DIFFICULTIES.indexOf(guess), DIFFICULTIES.indexOf(answer));
}

function compareColumn(column: Column, guess: Term, answer: Term): TileState {
  switch (column.key) {
    case 'category':
    case 'field':
    case 'family':
      return compareSingle(guess[column.key], answer[column.key]);
    case 'task':
    case 'learningType':
      return compareMulti(guess[column.key], answer[column.key]);
    case 'year':
      return compareNumber(guess.year, answer.year);
    case 'difficulty':
      return compareDifficulty(guess.difficulty, answer.difficulty);
  }
}

function displayValue(column: Column, term: Term): string {
  const value = term[column.key];
  return Array.isArray(value) ? value.join(', ') : String(value);
}

/** Compares a guessed term with the answer and returns one tile per attribute column. */
export function compareTerms(guess: Term, answer: Term): Tile[] {
  return COLUMNS.map((column) => ({
    column,
    text: displayValue(column, guess),
    state: compareColumn(column, guess, answer),
  }));
}
