import { decode, encode } from 'gpt-tokenizer/model/text-embedding-3-small';

/**
 * Splits text into token-bounded slices no larger than maxTokens. Returns the
 * original text as a single-element array when it already fits.
 */
export function sliceByTokens(text: string, maxTokens: number): string[] {
  const tokens = encode(text);
  if (tokens.length <= maxTokens) {
    return [text];
  }
  const slices: string[] = [];
  for (let i = 0; i < tokens.length; i += maxTokens) {
    slices.push(decode(tokens.slice(i, i + maxTokens)));
  }
  return slices;
}

export interface WeightedEmbedding {
  vector: number[];
  weight: number;
}

/**
 * Combines multiple slice embeddings for one oversized chunk into a single
 * vector: a token-weighted average, re-normalized to unit length (OpenAI
 * embeddings are expected to have unit norm for cosine similarity).
 */
export function combineWeightedEmbeddings(
  slices: WeightedEmbedding[],
): number[] {
  if (slices.length === 1) {
    return slices[0].vector;
  }

  const dimensions = slices[0].vector.length;
  const totalWeight = slices.reduce((sum, slice) => sum + slice.weight, 0);
  const combined = new Array<number>(dimensions).fill(0);

  for (const { vector, weight } of slices) {
    const share = weight / totalWeight;
    for (let d = 0; d < dimensions; d++) {
      combined[d] += vector[d] * share;
    }
  }

  const norm = Math.sqrt(
    combined.reduce((sum, value) => sum + value * value, 0),
  );
  return norm === 0 ? combined : combined.map((value) => value / norm);
}
