import { describe, expect, it } from 'vitest';
import { ANSWER_POOL, TERMS } from './terms.ts';
import { dailyTerm } from './daily.ts';
import { compareTerms } from './compare.ts';

describe('term data', () => {
  it('has at least 60 possible daily answers (v1 target)', () => {
    expect(ANSWER_POOL.length).toBeGreaterThanOrEqual(60);
  });

  it('turns a year within 5 orange (close), and a year further away red', () => {
    const byId = (id: string) => TERMS.find((t) => t.id === id)!;
    const yearState = (guess: string, answer: string) =>
      compareTerms(byId(guess), byId(answer)).find((t) => t.column.key === 'year')!.state;
    expect(yearState('pytorch', 'lora')).toBe('higher-close'); // 2016 vs 2021: 5 years
    expect(yearState('rag', 'lora')).toBe('higher-close'); // 2020 vs 2021
    expect(yearState('bert', 'lora')).toBe('higher-close'); // 2018 vs 2021
    expect(yearState('tensorflow', 'lora')).toBe('higher'); // 2015 vs 2021: 6 years, not close
    expect(yearState('lora', 'rag')).toBe('lower-close');
  });

  it('labels every clustering method the same way (Model), and EM as the Optimization that fits GMM', () => {
    const clustering = TERMS.filter((t) => t.task.includes('Clustering') && !['Metric', 'Dataset', 'Optimization'].includes(t.category));
    expect(clustering.length).toBeGreaterThanOrEqual(8);
    for (const t of clustering) expect(t.category, t.name).toBe('Model');
    expect(TERMS.find((t) => t.id === 'gmm')?.category).toBe('Model');
    expect(TERMS.find((t) => t.id === 'expectation-maximization')?.category).toBe('Optimization');
  });

  it('only picks daily answers from the answer pool', () => {
    for (let day = 1; day <= 365; day++) {
      const answer = dailyTerm(ANSWER_POOL, day);
      expect(answer.daily).toBe(true);
      expect(TERMS).toContain(answer);
    }
  });
});
