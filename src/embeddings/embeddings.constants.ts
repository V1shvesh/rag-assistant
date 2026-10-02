export const EMBEDDING_MODEL = 'text-embedding-3-small';
export const EMBEDDING_DIMENSIONS = 1536;

/**
 * OpenAI free-tier limits for embeddings (platform.openai.com/settings/organization/limits).
 * Keep these as named constants, not inline magic numbers, so a tier upgrade is a one-line change.
 */
export const FREE_TIER_REQUESTS_PER_MINUTE = 100;
export const FREE_TIER_REQUESTS_PER_DAY = 2000;
export const FREE_TIER_TOKENS_PER_MINUTE = 40_000;

/** Stay under the published limits to absorb clock drift or other usage on the same key. */
const SAFETY_MARGIN = 0.85;
export const SAFE_REQUESTS_PER_MINUTE = Math.floor(
  FREE_TIER_REQUESTS_PER_MINUTE * SAFETY_MARGIN,
);
export const SAFE_REQUESTS_PER_DAY = Math.floor(
  FREE_TIER_REQUESTS_PER_DAY * SAFETY_MARGIN,
);
export const SAFE_TOKENS_PER_MINUTE = Math.floor(
  FREE_TIER_TOKENS_PER_MINUTE * SAFETY_MARGIN,
);

/** Hard per-input model limit (not a tier limit) — text-embedding-3-small rejects any single input above this. */
export const MAX_TOKENS_PER_INPUT = 8191;
/** Leave headroom under MAX_TOKENS_PER_INPUT when slicing an oversized chunk for embedding. */
export const SLICE_TARGET_TOKENS = 8000;

/** Cap how many chunks are bundled into a single API call, regardless of token budget. */
export const MAX_ITEMS_PER_REQUEST = 100;
