import { countTokens } from 'gpt-tokenizer/model/text-embedding-3-small';
import { combineWeightedEmbeddings, sliceByTokens } from './embedding-pooling';

describe('sliceByTokens', () => {
  it('returns the original text unchanged when it already fits', () => {
    const text = 'a short sentence';
    expect(sliceByTokens(text, 100)).toEqual([text]);
  });

  it('splits long text into multiple slices each within the token limit', () => {
    const text = 'word '.repeat(5000).trim();
    const maxTokens = 50;

    const slices = sliceByTokens(text, maxTokens);

    expect(slices.length).toBeGreaterThan(1);
    for (const slice of slices) {
      expect(countTokens(slice)).toBeLessThanOrEqual(maxTokens);
    }
  });

  it('preserves the total token count across slices', () => {
    const text = 'word '.repeat(5000).trim();
    const maxTokens = 50;

    const slices = sliceByTokens(text, maxTokens);
    const totalSliceTokens = slices.reduce(
      (sum, slice) => sum + countTokens(slice),
      0,
    );

    expect(totalSliceTokens).toBe(countTokens(text));
  });
});

describe('combineWeightedEmbeddings', () => {
  it('returns the vector unchanged for a single slice', () => {
    const vector = [0.6, 0.8];
    expect(combineWeightedEmbeddings([{ vector, weight: 123 }])).toBe(vector);
  });

  it('produces a unit-length vector for multiple slices', () => {
    const result = combineWeightedEmbeddings([
      { vector: [1, 0], weight: 1 },
      { vector: [0, 1], weight: 1 },
    ]);

    const norm = Math.sqrt(result.reduce((sum, v) => sum + v * v, 0));
    expect(norm).toBeCloseTo(1, 10);
  });

  it('weights the average toward the heavier slice', () => {
    const result = combineWeightedEmbeddings([
      { vector: [1, 0], weight: 9 },
      { vector: [0, 1], weight: 1 },
    ]);

    expect(result[0]).toBeGreaterThan(result[1]);
  });

  it('returns an equal blend for equal weights', () => {
    const result = combineWeightedEmbeddings([
      { vector: [1, 0], weight: 1 },
      { vector: [0, 1], weight: 1 },
    ]);

    expect(result[0]).toBeCloseTo(result[1], 10);
  });
});
