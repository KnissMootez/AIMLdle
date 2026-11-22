import { describe, expect, it } from 'vitest';
import type { Term } from './attributes.ts';
import { findExact, findMatches, normalize } from './search.ts';

function term(id: string, name: string, aliases: string[] = []): Term {
  return {
    id, name, aliases,
    category: 'Model', task: ['General'], learningType: ['N/A'], year: 2000,
    field: 'Statistics', family: 'Foundations', difficulty: 'Beginner', daily: true,
    explanation: '', source: '', verify: false,
  };
}

const terms = [
  term('t-sne', 't-SNE', ['tsne']),
  term('svm', 'Support Vector Machine', ['svm']),
  term('lstm', 'Long Short-Term Memory (LSTM)', ['lstm']),
  term('logistic', 'Logistic Regression'),
  term('linear', 'Linear Regression'),
];

describe('normalize', () => {
  it('ignores case, punctuation and accents', () => {
    expect(normalize('t-SNE')).toBe('tsne');
    expect(normalize('Méthode')).toBe('methode');
  });
});

describe('findMatches', () => {
  it('matches names and aliases regardless of punctuation', () => {
    expect(findMatches(terms, 'tsn', new Set()).map((t) => t.id)).toEqual(['t-sne']);
    expect(findMatches(terms, 'SVM', new Set()).map((t) => t.id)).toEqual(['svm']);
  });

  it('ranks prefix matches above substring matches', () => {
    // "machine" is only a substring of "Support Vector Machine"; "lo" is a prefix of two names.
    expect(findMatches(terms, 'machine', new Set()).map((t) => t.id)).toEqual(['svm']);
    expect(findMatches(terms, 'regression', new Set()).map((t) => t.id)).toEqual(['linear', 'logistic']);
    expect(findMatches([term('a', 'Alpha Linear'), terms[4]], 'linear', new Set()).map((t) => t.id))
      .toEqual(['linear', 'a']);
    expect(findMatches(terms, 'lo', new Set()).map((t) => t.id)).toEqual(['logistic', 'lstm']);
  });

  it('leaves out terms that were already guessed', () => {
    expect(findMatches(terms, 'l', new Set(['lstm', 'linear'])).map((t) => t.id)).toEqual(['logistic']);
  });

  it('returns nothing for an empty query', () => {
    expect(findMatches(terms, '  - ', new Set())).toEqual([]);
  });
});

describe('findExact', () => {
  it('finds a term by its exact name or alias', () => {
    expect(findExact(terms, 'support vector machine')?.id).toBe('svm');
    expect(findExact(terms, 'LSTM')?.id).toBe('lstm');
    expect(findExact(terms, 'support')).toBeUndefined();
  });
});
