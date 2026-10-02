import { Injectable, Logger, Optional } from '@nestjs/common';
import {
  SAFE_REQUESTS_PER_DAY,
  SAFE_REQUESTS_PER_MINUTE,
  SAFE_TOKENS_PER_MINUTE,
} from './embeddings.constants';

const MINUTE_MS = 60_000;

export class DailyLimitExceededError extends Error {
  constructor(requestsPerDay: number) {
    super(
      `Daily request limit (${requestsPerDay} requests, with safety margin) reached. ` +
        'Resume once the limit resets (OpenAI resets daily limits at midnight UTC).',
    );
    this.name = 'DailyLimitExceededError';
  }
}

export interface RateLimiterBudget {
  requestsPerMinute: number;
  tokensPerMinute: number;
  requestsPerDay: number;
}

const DEFAULT_BUDGET: RateLimiterBudget = {
  requestsPerMinute: SAFE_REQUESTS_PER_MINUTE,
  tokensPerMinute: SAFE_TOKENS_PER_MINUTE,
  requestsPerDay: SAFE_REQUESTS_PER_DAY,
};

/**
 * Proactively throttles embedding requests to stay under OpenAI's account-tier
 * per-minute and per-day limits, so 429s from the API are the exception, not
 * the norm. Fixed-window counters are enough for a single-process, low-volume
 * personal ingestion job — no need for a sliding window or external store.
 */
@Injectable()
export class EmbeddingsRateLimiter {
  private readonly logger = new Logger(EmbeddingsRateLimiter.name);
  private readonly budget: RateLimiterBudget;

  private minuteWindowStart = Date.now();
  private requestsThisMinute = 0;
  private tokensThisMinute = 0;

  private dayWindowStart = this.startOfUtcDay(Date.now());
  private requestsToday = 0;

  constructor(@Optional() budget: RateLimiterBudget = DEFAULT_BUDGET) {
    this.budget = budget;
  }

  /**
   * Blocks (sleeping if necessary) until a request of `tokenCount` tokens can be
   * sent without breaching the per-minute limits, then reserves that capacity.
   * Throws DailyLimitExceededError immediately, without sleeping, if the daily
   * cap is already spent — waiting out a day-long window isn't practical here.
   */
  async reserve(tokenCount: number): Promise<void> {
    this.rolloverWindowsIfElapsed();

    if (this.requestsToday >= this.budget.requestsPerDay) {
      throw new DailyLimitExceededError(this.budget.requestsPerDay);
    }

    const wouldExceedMinuteLimit =
      this.requestsThisMinute + 1 > this.budget.requestsPerMinute ||
      this.tokensThisMinute + tokenCount > this.budget.tokensPerMinute;

    if (wouldExceedMinuteLimit) {
      const waitMs = this.minuteWindowStart + MINUTE_MS - Date.now();
      if (waitMs > 0) {
        this.logger.log(
          `Rate limit budget spent for this minute, waiting ${Math.ceil(waitMs / 1000)}s`,
        );
        await this.sleep(waitMs);
      }
      this.rolloverWindowsIfElapsed(true);
    }

    this.requestsThisMinute++;
    this.tokensThisMinute += tokenCount;
    this.requestsToday++;
  }

  private rolloverWindowsIfElapsed(force = false): void {
    const now = Date.now();
    if (force || now - this.minuteWindowStart >= MINUTE_MS) {
      this.minuteWindowStart = now;
      this.requestsThisMinute = 0;
      this.tokensThisMinute = 0;
    }
    const today = this.startOfUtcDay(now);
    if (today !== this.dayWindowStart) {
      this.dayWindowStart = today;
      this.requestsToday = 0;
    }
  }

  private startOfUtcDay(timestamp: number): number {
    const date = new Date(timestamp);
    return Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
