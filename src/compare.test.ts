import { describe, expect, it } from 'vitest';
import type { Term } from './attributes.ts';
import {
  compareDifficulty,
  compareMulti,
  compareNumber,
  compareSingle,
  compareTerms,
} from './compare.ts';

function term(overrides: Partial<Term>): Term {
  return {
    id: 'x',
    name: 'X',
    aliases: [],
    category: 'Model',
    task: ['Classification'],
    learningType: ['Supervised'],
    year: 2000,
    field: 'Statistics',
    family: 'Classical ML',
    difficulty: 'Intermediate',
    daily: true,
    explanation: '',
    source: '',
    verify: false,
    ...overrides,
  };
}

describe('compareSingle', () => {
  it('is correct when equal and wrong otherwise', () => {
    expect(compareSingle('Model', 'Model')).toBe('correct');
    expect(compareSingle('Model', 'Metric')).toBe('wrong');
  });
});

describe('compareMulti', () => {
  it('is correct for the same set, in any order', () => {
    expect(compareMulti(['Classification', 'Regression'], ['Regression', 'Classification'])).toBe('correct');
  });

  it('is partial when the guess is a subset of the answer', () => {
    expect(compareMulti(['Classification'], ['Classification', 'Regression'])).toBe('partial');
  });

  it('is partial when the guess is a superset of the answer', () => {
    expect(compareMulti(['Classification', 'Regression'], ['Classification'])).toBe('partial');
  });

  it('is partial when the sets only overlap', () => {
    expect(compareMulti(['Classification', 'Clustering'], ['Classification', 'Regression'])).toBe('partial');
  });

  it('is wrong when nothing is shared', () => {
    expect(compareMulti(['Clustering'], ['Classification', 'Regression'])).toBe('wrong');
  });

  it('is not fooled by duplicate values', () => {
    expect(compareMulti(['Classification', 'Classification'], ['Classification', 'Regression'])).toBe('partial');
  });
});

describe('compareNumber', () => {
  it('is correct when equal', () => {
    expect(compareNumber(1998, 1998)).toBe('correct');
  });

  it('says "higher" when the answer is later than the guess', () => {
    expect(compareNumber(1990, 2017)).toBe('higher');
  });

  it('says "lower" when the answer is earlier than the guess', () => {
    expect(compareNumber(2017, 1805)).toBe('lower');
  });
});

describe('compareDifficulty', () => {
  it('uses Beginner < Intermediate < Advanced', () => {
    expect(compareDifficulty('Beginner', 'Advanced')).toBe('higher');
    expect(compareDifficulty('Advanced', 'Intermediate')).toBe('lower');
    expect(compareDifficulty('Intermediate', 'Intermediate')).toBe('correct');
  });
});

describe('compareTerms', () => {
  it('returns all-correct tiles for the answer itself', () => {
    const t = term({});
    expect(compareTerms(t, t).every((tile) => tile.state === 'correct')).toBe(true);
  });

  it('returns one tile per column, in column order, with the guess values as text', () => {
    const guess = term({
      category: 'Metric',
      task: ['Classification', 'Regression'],
      learningType: ['N/A'],
      year: 1950,
      field: 'Statistics',
      family: 'Foundations',
      difficulty: 'Advanced',
    });
    const answer = term({});
    const tiles = compareTerms(guess, answer);
    expect(tiles.map((t) => [t.column.key, t.text, t.state])).toEqual([
      ['category', 'Metric', 'wrong'],
      ['task', 'Classification, Regression', 'partial'],
      ['learningType', 'N/A', 'wrong'],
      ['year', '1950', 'higher'],
      ['field', 'Statistics', 'correct'],
      ['family', 'Foundations', 'wrong'],
      ['difficulty', 'Advanced', 'lower'],
    ]);
  });
});
