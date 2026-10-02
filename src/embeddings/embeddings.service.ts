import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI, { APIError, AuthenticationError } from 'openai';
import { Pool } from 'pg';
import pgvector from 'pgvector';
import { countTokens } from 'gpt-tokenizer/model/text-embedding-3-small';
import { PG_POOL } from '../database/database.module';
import { combineWeightedEmbeddings, sliceByTokens } from './embedding-pooling';
import {
  DailyLimitExceededError,
  EmbeddingsRateLimiter,
} from './embeddings-rate-limiter';
import {
  EMBEDDING_MODEL,
  MAX_ITEMS_PER_REQUEST,
  SAFE_TOKENS_PER_MINUTE,
  SLICE_TARGET_TOKENS,
} from './embeddings.constants';

interface ChunkRow {
  id: number;
  text: string;
}

interface ChunkWithSlices {
  id: number;
  slices: string[];
  sliceTokenCounts: number[];
  totalTokens: number;
}

export interface EmbeddingRunResult {
  totalChunks: number;
  alreadyEmbedded: number;
  embedded: number;
  failed: number;
  errors: { id: number; message: string }[];
  stoppedEarly?: { reason: string; remaining: number };
}

@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);
  private readonly client: OpenAI;

  constructor(
    private readonly config: ConfigService,
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly rateLimiter: EmbeddingsRateLimiter,
  ) {
    this.client = new OpenAI({
      apiKey: this.config.getOrThrow<string>('OPENAI_API_KEY'),
    });
  }

  /** Embeds a single piece of text — used by retrieval at query time, via the same slicing/pooling path as chunk embedding. */
  async embed(text: string): Promise<number[]> {
    const chunk = this.toChunkWithSlices({ id: 0, text });
    const vectors = await this.embedSlices(chunk.slices);
    return combineWeightedEmbeddings(
      vectors.map((vector, i) => ({
        vector,
        weight: chunk.sliceTokenCounts[i],
      })),
    );
  }

  async generateForChunks(source?: string): Promise<EmbeddingRunResult> {
    const [totalChunks, pendingRows] = await Promise.all([
      this.countChunks(source),
      this.loadPendingChunks(source),
    ]);

    const result: EmbeddingRunResult = {
      totalChunks,
      alreadyEmbedded: totalChunks - pendingRows.length,
      embedded: 0,
      failed: 0,
      errors: [],
    };

    const pending = pendingRows.map((row) => this.toChunkWithSlices(row));
    const batches = this.packIntoBatches(pending);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      try {
        await this.embedAndSaveBatch(batch);
        result.embedded += batch.length;
      } catch (error) {
        const stopReason =
          error instanceof DailyLimitExceededError
            ? error.message
            : this.fatalReasonFor(error);

        if (stopReason) {
          const remaining = batches
            .slice(batchIndex)
            .reduce((sum, b) => sum + b.length, 0);
          this.logger.warn(
            `${stopReason} ${remaining} chunk(s) left pending for a future run.`,
          );
          result.stoppedEarly = { reason: stopReason, remaining };
          return result;
        }

        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Failed to embed batch (chunk ids ${batch.map((c) => c.id).join(',')}): ${message}`,
        );
        for (const chunk of batch) {
          result.failed++;
          result.errors.push({ id: chunk.id, message });
        }
      }
    }

    return result;
  }

  /**
   * Distinguishes errors that no amount of waiting/retrying will fix (bad credentials,
   * an exhausted billing balance) from transient ones. Returns a human-readable reason
   * to abort the whole run on, or null if the batch-level failure handling should apply.
   */
  private fatalReasonFor(error: unknown): string | null {
    if (error instanceof AuthenticationError) {
      return `OpenAI authentication failed: ${error.message}`;
    }
    if (error instanceof APIError && error.type === 'insufficient_quota') {
      return `OpenAI account has insufficient quota: ${error.message}`;
    }
    return null;
  }

  private async embedAndSaveBatch(batch: ChunkWithSlices[]): Promise<void> {
    const flatSlices = batch.flatMap((chunk) => chunk.slices);
    const vectors = await this.embedSlices(flatSlices);

    let cursor = 0;
    for (const chunk of batch) {
      const chunkVectors = vectors.slice(cursor, cursor + chunk.slices.length);
      cursor += chunk.slices.length;
      const embedding = combineWeightedEmbeddings(
        chunkVectors.map((vector, i) => ({
          vector,
          weight: chunk.sliceTokenCounts[i],
        })),
      );
      await this.saveEmbedding(chunk.id, embedding);
    }
  }

  /** Sends one rate-limited OpenAI request for a flat list of inputs, returning vectors in the same order. */
  private async embedSlices(inputs: string[]): Promise<number[][]> {
    const tokenCount = inputs.reduce((sum, text) => sum + countTokens(text), 0);
    await this.rateLimiter.reserve(tokenCount);

    const response = await this.client.embeddings.create({
      input: inputs,
      model: EMBEDDING_MODEL,
    });

    return response.data
      .sort((a, b) => a.index - b.index)
      .map((item) => item.embedding);
  }

  private toChunkWithSlices(row: ChunkRow): ChunkWithSlices {
    const slices = sliceByTokens(row.text, SLICE_TARGET_TOKENS);
    const sliceTokenCounts = slices.map((slice) => countTokens(slice));
    return {
      id: row.id,
      slices,
      sliceTokenCounts,
      totalTokens: sliceTokenCounts.reduce((sum, n) => sum + n, 0),
    };
  }

  /** Bin-packs chunks into request-sized batches, keeping each chunk's slices together in one batch/request. */
  private packIntoBatches(chunks: ChunkWithSlices[]): ChunkWithSlices[][] {
    const batches: ChunkWithSlices[][] = [];
    let currentBatch: ChunkWithSlices[] = [];
    let currentTokens = 0;
    let currentItems = 0;

    for (const chunk of chunks) {
      const wouldOverflow =
        currentBatch.length > 0 &&
        (currentTokens + chunk.totalTokens > SAFE_TOKENS_PER_MINUTE ||
          currentItems + chunk.slices.length > MAX_ITEMS_PER_REQUEST);

      if (wouldOverflow) {
        batches.push(currentBatch);
        currentBatch = [];
        currentTokens = 0;
        currentItems = 0;
      }

      currentBatch.push(chunk);
      currentTokens += chunk.totalTokens;
      currentItems += chunk.slices.length;
    }

    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }

    return batches;
  }

  private async countChunks(source?: string): Promise<number> {
    const result = await this.pool.query<{ count: string }>(
      'SELECT count(*) FROM chunks WHERE ($1::text IS NULL OR source = $1)',
      [source ?? null],
    );
    return Number(result.rows[0].count);
  }

  private async loadPendingChunks(source?: string): Promise<ChunkRow[]> {
    const result = await this.pool.query<ChunkRow>(
      'SELECT id, text FROM chunks WHERE embedding IS NULL AND ($1::text IS NULL OR source = $1) ORDER BY id',
      [source ?? null],
    );
    return result.rows;
  }

  private async saveEmbedding(id: number, embedding: number[]): Promise<void> {
    await this.pool.query(
      'UPDATE chunks SET embedding = $1::vector WHERE id = $2',
      [pgvector.toSql(embedding), id],
    );
  }
}
