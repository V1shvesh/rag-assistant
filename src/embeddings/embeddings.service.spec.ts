import type { ConfigService } from '@nestjs/config';
import type { Pool } from 'pg';
import type { APIError, AuthenticationError, RateLimitError } from 'openai';
import { EmbeddingsService } from './embeddings.service';
import type { EmbeddingsRateLimiter } from './embeddings-rate-limiter';
import { MAX_ITEMS_PER_REQUEST } from './embeddings.constants';

interface OpenAIModule {
  APIError: typeof APIError;
  AuthenticationError: typeof AuthenticationError;
  RateLimitError: typeof RateLimitError;
}

interface EmbeddingsCreateParams {
  input: string[];
  model: string;
}

type EmbeddingsCreateMock = jest.Mock<
  Promise<{ data: { index: number; embedding: number[] }[] }>,
  [EmbeddingsCreateParams]
>;

let mockEmbeddingsCreate: EmbeddingsCreateMock;

jest.mock('openai', () => {
  const actual = jest.requireActual<OpenAIModule>('openai');
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      embeddings: { create: mockEmbeddingsCreate },
    })),
    APIError: actual.APIError,
    AuthenticationError: actual.AuthenticationError,
    RateLimitError: actual.RateLimitError,
  };
});

// Treat one character as one "token" so batch/slice sizing is simple and exact in tests.
jest.mock('gpt-tokenizer/model/text-embedding-3-small', () => ({
  countTokens: (text: string) => text.length,
  encode: (text: string) => text.split(''),
  decode: (tokens: string[]) => tokens.join(''),
}));

const openaiActual = jest.requireActual<OpenAIModule>('openai');

interface ChunkRow {
  id: number;
  text: string;
}

function fakeEmbeddingResponse(inputs: string[]) {
  return {
    data: inputs.map((_, index) => ({
      index,
      embedding: new Array(4).fill(index + 1),
    })),
  };
}

describe('EmbeddingsService', () => {
  let fakeConfig: Pick<ConfigService, 'getOrThrow'>;
  let fakePool: { query: jest.Mock };
  let fakeRateLimiter: Pick<EmbeddingsRateLimiter, 'reserve'>;
  let savedUpdates: Array<{ id: number; embeddingSql: string }>;
  let pendingRows: ChunkRow[];
  let totalChunks: number;

  function buildService(): EmbeddingsService {
    return new EmbeddingsService(
      fakeConfig as ConfigService,
      fakePool as unknown as Pool,
      fakeRateLimiter as EmbeddingsRateLimiter,
    );
  }

  beforeEach(() => {
    mockEmbeddingsCreate = jest.fn((params: EmbeddingsCreateParams) =>
      Promise.resolve(fakeEmbeddingResponse(params.input)),
    );
    fakeConfig = { getOrThrow: jest.fn().mockReturnValue('fake-api-key') };
    fakeRateLimiter = { reserve: jest.fn().mockResolvedValue(undefined) };
    savedUpdates = [];
    pendingRows = [];
    totalChunks = 0;

    fakePool = {
      query: jest.fn((sql: string, params: unknown[]) => {
        if (sql.startsWith('SELECT count')) {
          return Promise.resolve({ rows: [{ count: String(totalChunks) }] });
        }
        if (sql.startsWith('SELECT id, text')) {
          return Promise.resolve({ rows: pendingRows });
        }
        if (sql.startsWith('UPDATE chunks')) {
          savedUpdates.push({
            id: params[1] as number,
            embeddingSql: params[0] as string,
          });
          return Promise.resolve({ rows: [] });
        }
        throw new Error(`unexpected query: ${sql}`);
      }),
    };
  });

  it('reports alreadyEmbedded as the gap between total and pending chunks', async () => {
    totalChunks = 5;
    pendingRows = [{ id: 1, text: 'hello' }];

    const result = await buildService().generateForChunks();

    expect(result.totalChunks).toBe(5);
    expect(result.alreadyEmbedded).toBe(4);
  });

  it('packs small chunks into a single request and saves each embedding', async () => {
    totalChunks = 2;
    pendingRows = [
      { id: 1, text: 'a'.repeat(100) },
      { id: 2, text: 'b'.repeat(100) },
    ];

    const result = await buildService().generateForChunks();

    expect(mockEmbeddingsCreate).toHaveBeenCalledTimes(1);
    expect(mockEmbeddingsCreate.mock.calls[0][0].input).toHaveLength(2);
    expect(savedUpdates.map((u) => u.id)).toEqual([1, 2]);
    expect(result.embedded).toBe(2);
    expect(result.failed).toBe(0);
  });

  it('splits into multiple requests once the per-request item cap would be exceeded', async () => {
    const chunkCount = MAX_ITEMS_PER_REQUEST + 1;
    totalChunks = chunkCount;
    // One more chunk than MAX_ITEMS_PER_REQUEST allows in a single batch, each tiny
    // enough that the token budget is never the binding constraint here.
    pendingRows = Array.from({ length: chunkCount }, (_, i) => ({
      id: i + 1,
      text: 'x'.repeat(10),
    }));

    const result = await buildService().generateForChunks();

    expect(mockEmbeddingsCreate).toHaveBeenCalledTimes(2);
    expect(mockEmbeddingsCreate.mock.calls[0][0].input).toHaveLength(
      MAX_ITEMS_PER_REQUEST,
    );
    expect(mockEmbeddingsCreate.mock.calls[1][0].input).toHaveLength(1);
    expect(result.embedded).toBe(chunkCount);
  });

  it('slices an oversized chunk and saves one combined embedding for it', async () => {
    totalChunks = 1;
    pendingRows = [{ id: 1, text: 'y'.repeat(9000) }]; // > SLICE_TARGET_TOKENS (8000)

    const result = await buildService().generateForChunks();

    expect(mockEmbeddingsCreate).toHaveBeenCalledTimes(1);
    expect(mockEmbeddingsCreate.mock.calls[0][0].input).toHaveLength(2); // two slices, one request
    expect(savedUpdates).toHaveLength(1); // combined into a single saved embedding
    expect(savedUpdates[0].id).toBe(1);
    expect(result.embedded).toBe(1);
  });

  it('records a per-chunk failure for the failed batch but still processes the next one', async () => {
    const chunkCount = MAX_ITEMS_PER_REQUEST + 1;
    totalChunks = chunkCount;
    // Same item-cap-driven split as the batching test above, so each batch can fail independently.
    pendingRows = Array.from({ length: chunkCount }, (_, i) => ({
      id: i + 1,
      text: 'x'.repeat(10),
    }));
    mockEmbeddingsCreate
      .mockImplementationOnce(() =>
        Promise.reject(new Error('transient failure')),
      )
      .mockImplementationOnce((params: EmbeddingsCreateParams) =>
        Promise.resolve(fakeEmbeddingResponse(params.input)),
      );

    const result = await buildService().generateForChunks();

    expect(result.failed).toBe(MAX_ITEMS_PER_REQUEST);
    expect(result.errors).toHaveLength(MAX_ITEMS_PER_REQUEST);
    expect(result.errors[0]).toEqual({ id: 1, message: 'transient failure' });
    expect(result.embedded).toBe(1);
    expect(savedUpdates.map((u) => u.id)).toEqual([chunkCount]);
  });

  it('stops the whole run and leaves remaining chunks pending on insufficient quota', async () => {
    totalChunks = 2;
    pendingRows = [
      { id: 1, text: 'a'.repeat(100) },
      { id: 2, text: 'b'.repeat(100) },
    ];
    const quotaError = new openaiActual.RateLimitError(
      429,
      { type: 'insufficient_quota', message: 'no credits' },
      'no credits',
      new Headers(),
    );
    mockEmbeddingsCreate.mockRejectedValue(quotaError);

    const result = await buildService().generateForChunks();

    expect(result.stoppedEarly).toBeDefined();
    expect(result.stoppedEarly?.reason).toContain('insufficient quota');
    expect(result.failed).toBe(0);
    expect(result.embedded).toBe(0);
    expect(savedUpdates).toHaveLength(0);
  });

  it('stops the whole run on an authentication error', async () => {
    totalChunks = 1;
    pendingRows = [{ id: 1, text: 'a'.repeat(100) }];
    const authError = new openaiActual.AuthenticationError(
      401,
      { message: 'bad key' },
      'bad key',
      new Headers(),
    );
    mockEmbeddingsCreate.mockRejectedValue(authError);

    const result = await buildService().generateForChunks();

    expect(result.stoppedEarly?.reason).toContain('authentication failed');
  });
});
