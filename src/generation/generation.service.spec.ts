import {
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type {
  APIConnectionError,
  AuthenticationError,
  InternalServerError,
  RateLimitError,
} from '@anthropic-ai/sdk';
import { GenerationService } from './generation.service';
import {
  RetrievalService,
  RetrievedChunk,
} from '../retrieval/retrieval.service';
import { NO_CONTEXT_ANSWER } from './generation.constants';

interface AnthropicModule {
  APIConnectionError: typeof APIConnectionError;
  AuthenticationError: typeof AuthenticationError;
  InternalServerError: typeof InternalServerError;
  RateLimitError: typeof RateLimitError;
}

interface MessagesCreateParams {
  model: string;
  max_tokens: number;
  system: string;
  messages: { role: string; content: string }[];
}

type MessagesCreateMock = jest.Mock<Promise<unknown>, [MessagesCreateParams]>;

let mockMessagesCreate: MessagesCreateMock;

jest.mock('@anthropic-ai/sdk', () => {
  const actual = jest.requireActual<AnthropicModule>('@anthropic-ai/sdk');
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      messages: { create: mockMessagesCreate },
    })),
    APIConnectionError: actual.APIConnectionError,
    AuthenticationError: actual.AuthenticationError,
    InternalServerError: actual.InternalServerError,
    RateLimitError: actual.RateLimitError,
  };
});

const anthropicActual =
  jest.requireActual<AnthropicModule>('@anthropic-ai/sdk');

function fakeChunk(overrides: Partial<RetrievedChunk> = {}): RetrievedChunk {
  return {
    id: 1,
    source: 'Project Hail Mary',
    chapterTitle: 'Chapter 9',
    text: 'Rocky is an alien engineer.',
    distance: 0.1,
    ...overrides,
  };
}

function fakeTextResponse(
  text: string,
  stopReason: string | null = 'end_turn',
) {
  return { content: [{ type: 'text', text }], stop_reason: stopReason };
}

describe('GenerationService', () => {
  let fakeRetrievalService: { search: jest.Mock };
  let fakeConfig: Pick<ConfigService, 'getOrThrow'>;
  let service: GenerationService;

  beforeEach(() => {
    mockMessagesCreate = jest
      .fn()
      .mockResolvedValue(
        fakeTextResponse('Rocky is an alien.'),
      ) as MessagesCreateMock;
    fakeRetrievalService = {
      search: jest.fn().mockResolvedValue([fakeChunk()]),
    };
    fakeConfig = { getOrThrow: jest.fn().mockReturnValue('fake-api-key') };
    service = new GenerationService(
      fakeRetrievalService as unknown as RetrievalService,
      fakeConfig as ConfigService,
    );
  });

  it('short-circuits with a deterministic answer when no chunks are retrieved, without calling Claude', async () => {
    fakeRetrievalService.search.mockResolvedValue([]);

    const result = await service.answer('Who is Rocky?');

    expect(result).toEqual({
      answer: NO_CONTEXT_ANSWER,
      citations: [],
      groundedInContext: false,
      truncated: false,
    });
    expect(mockMessagesCreate).not.toHaveBeenCalled();
  });

  it('builds a prompt containing the grounding instruction and all chunk texts', async () => {
    fakeRetrievalService.search.mockResolvedValue([
      fakeChunk({ chapterTitle: 'Chapter 9', text: 'Rocky text one.' }),
      fakeChunk({ chapterTitle: 'Chapter 10', text: 'Rocky text two.' }),
    ]);

    await service.answer('Who is Rocky?');

    const [params] = mockMessagesCreate.mock.calls[0];
    expect(params.system).toContain("I don't know");
    expect(params.messages[0].content).toContain('Rocky text one.');
    expect(params.messages[0].content).toContain('Rocky text two.');
    expect(params.messages[0].content).toContain('Who is Rocky?');
  });

  it('dedupes citations by chapter title', async () => {
    fakeRetrievalService.search.mockResolvedValue([
      fakeChunk({ chapterTitle: 'Chapter 9' }),
      fakeChunk({ chapterTitle: 'Chapter 9' }),
      fakeChunk({ chapterTitle: 'Chapter 10' }),
    ]);

    const result = await service.answer('Who is Rocky?');

    expect(result.citations).toEqual(['Chapter 9', 'Chapter 10']);
    expect(result.groundedInContext).toBe(true);
  });

  it('flags truncated when stop_reason is max_tokens', async () => {
    mockMessagesCreate.mockResolvedValue(
      fakeTextResponse('partial ans', 'max_tokens'),
    );

    const result = await service.answer('Who is Rocky?');

    expect(result.truncated).toBe(true);
  });

  it('does not flag truncated on a normal end_turn stop', async () => {
    const result = await service.answer('Who is Rocky?');

    expect(result.truncated).toBe(false);
  });

  it('throws InternalServerErrorException on AuthenticationError', async () => {
    const error = new anthropicActual.AuthenticationError(
      401,
      { message: 'bad key' },
      'bad key',
      new Headers(),
    );
    mockMessagesCreate.mockRejectedValue(error);

    await expect(service.answer('Who is Rocky?')).rejects.toThrow(
      InternalServerErrorException,
    );
  });

  it('throws ServiceUnavailableException on RateLimitError', async () => {
    const error = new anthropicActual.RateLimitError(
      429,
      { message: 'rate limited' },
      'rate limited',
      new Headers(),
    );
    mockMessagesCreate.mockRejectedValue(error);

    await expect(service.answer('Who is Rocky?')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('throws ServiceUnavailableException on APIConnectionError', async () => {
    const error = new anthropicActual.APIConnectionError({
      message: 'network down',
    });
    mockMessagesCreate.mockRejectedValue(error);

    await expect(service.answer('Who is Rocky?')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('throws ServiceUnavailableException on InternalServerError', async () => {
    const error = new anthropicActual.InternalServerError(
      500,
      { message: 'oops' },
      'oops',
      new Headers(),
    );
    mockMessagesCreate.mockRejectedValue(error);

    await expect(service.answer('Who is Rocky?')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('throws InternalServerErrorException with the message for any other error', async () => {
    mockMessagesCreate.mockRejectedValue(new Error('something weird'));

    await expect(service.answer('Who is Rocky?')).rejects.toThrow(
      'Generation failed: something weird',
    );
  });

  it('throws InternalServerErrorException when the response has no text block', async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [],
      stop_reason: 'end_turn',
    });

    await expect(service.answer('Who is Rocky?')).rejects.toThrow(
      InternalServerErrorException,
    );
  });

  it('propagates a RetrievalService rejection unchanged, without a false I-dont-know answer', async () => {
    const error = new Error('insufficient_quota');
    fakeRetrievalService.search.mockRejectedValue(error);

    await expect(service.answer('Who is Rocky?')).rejects.toThrow(error);
    expect(mockMessagesCreate).not.toHaveBeenCalled();
  });
});
