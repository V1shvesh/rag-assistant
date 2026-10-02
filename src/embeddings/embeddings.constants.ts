export const EMBEDDING_MODEL = 'text-embedding-3-small';
export const EMBEDDING_DIMENSIONS = 1536;

/**
 * OpenAI account-tier limits for embeddings (platform.openai.com/settings/organization/limits).
 * Keep these as named constants, not inline magic numbers, so a tier change is a one-line edit.
 *
 * Account is on Tier 1 (dashboard: 3,000 RPM / no published RPD cap / 1,000,000 TPM),
 * but as of 2026-10-02 the live API still enforces a 40,000 TPM limit for this model
 * ("Limit 40000, Requested 216305") — tier upgrades can lag behind the dashboard before
 * they propagate. TIER_TOKENS_PER_MINUTE reflects what's actually enforced; bump it to
 * 1_000_000 once a real request confirms the higher limit is live.
 */
export const TIER_REQUESTS_PER_MINUTE = 3_000;
/** Tier 1 publishes no daily request cap — Infinity makes the daily check in EmbeddingsRateLimiter a no-op. */
export const TIER_REQUESTS_PER_DAY = Infinity;
export const TIER_TOKENS_PER_MINUTE = 40_000;

/** Stay under the published limits to absorb clock drift or other usage on the same key. */
const SAFETY_MARGIN = 0.85;
export const SAFE_REQUESTS_PER_MINUTE = Math.floor(
  TIER_REQUESTS_PER_MINUTE * SAFETY_MARGIN,
);
export const SAFE_REQUESTS_PER_DAY = Math.floor(
  TIER_REQUESTS_PER_DAY * SAFETY_MARGIN,
);
export const SAFE_TOKENS_PER_MINUTE = Math.floor(
  TIER_TOKENS_PER_MINUTE * SAFETY_MARGIN,
);

/** Hard per-input model limit (not a tier limit) — text-embedding-3-small rejects any single input above this. */
export const MAX_TOKENS_PER_INPUT = 8191;
/** Leave headroom under MAX_TOKENS_PER_INPUT when slicing an oversized chunk for embedding. */
export const SLICE_TARGET_TOKENS = 8000;

/** Cap how many chunks are bundled into a single API call, regardless of token budget. */
export const MAX_ITEMS_PER_REQUEST = 100;
