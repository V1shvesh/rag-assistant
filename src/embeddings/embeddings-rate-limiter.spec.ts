import {
  DailyLimitExceededError,
  EmbeddingsRateLimiter,
} from './embeddings-rate-limiter';
import { SAFE_TOKENS_PER_MINUTE } from './embeddings.constants';

describe('EmbeddingsRateLimiter', () => {
  let limiter: EmbeddingsRateLimiter;

  beforeEach(() => {
    jest.useFakeTimers();
    limiter = new EmbeddingsRateLimiter();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('allows a request within the per-minute token budget without waiting', async () => {
    await expect(limiter.reserve(1000)).resolves.toBeUndefined();
  });

  it('waits out the rest of the minute once the token budget is spent', async () => {
    await limiter.reserve(SAFE_TOKENS_PER_MINUTE);

    let resolved = false;
    const reservePromise = limiter.reserve(1).then(() => {
      resolved = true;
    });

    await jest.advanceTimersByTimeAsync(30_000);
    expect(resolved).toBe(false);

    await jest.advanceTimersByTimeAsync(30_001);
    await reservePromise;
    expect(resolved).toBe(true);
  });

  it('resets the token budget after the minute window elapses', async () => {
    await limiter.reserve(SAFE_TOKENS_PER_MINUTE);
    await jest.advanceTimersByTimeAsync(60_001);

    await expect(
      limiter.reserve(SAFE_TOKENS_PER_MINUTE),
    ).resolves.toBeUndefined();
  });

  it('throws DailyLimitExceededError without waiting once the daily cap is reached', async () => {
    (limiter as unknown as { requestsToday: number }).requestsToday = 999_999;

    await expect(limiter.reserve(1)).rejects.toThrow(DailyLimitExceededError);
  });
});
