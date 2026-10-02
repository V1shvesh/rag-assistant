import {
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic, {
  APIConnectionError,
  AuthenticationError,
  InternalServerError,
  RateLimitError,
} from '@anthropic-ai/sdk';
import { RetrievalService } from '../retrieval/retrieval.service';
import {
  DEFAULT_K,
  GENERATION_MODEL,
  GROUNDING_SYSTEM_PROMPT,
  MAX_OUTPUT_TOKENS,
  NO_CONTEXT_ANSWER,
} from './generation.constants';

export interface GenerationResult {
  answer: string;
  citations: string[];
  groundedInContext: boolean;
  truncated: boolean;
}

@Injectable()
export class GenerationService {
  private readonly client: Anthropic;

  constructor(
    private readonly retrievalService: RetrievalService,
    private readonly config: ConfigService,
  ) {
    this.client = new Anthropic({
      apiKey: this.config.getOrThrow<string>('ANTHROPIC_API_KEY'),
    });
  }

  async answer(
    question: string,
    k = DEFAULT_K,
    source?: string,
  ): Promise<GenerationResult> {
    const chunks = await this.retrievalService.search(question, k, source);

    if (chunks.length === 0) {
      return {
        answer: NO_CONTEXT_ANSWER,
        citations: [],
        groundedInContext: false,
        truncated: false,
      };
    }

    const context = chunks
      .map((chunk, i) => `[${i + 1}] (${chunk.chapterTitle})\n${chunk.text}`)
      .join('\n\n');
    const citations = [...new Set(chunks.map((chunk) => chunk.chapterTitle))];

    let response: Anthropic.Message;
    try {
      response = await this.client.messages.create({
        model: GENERATION_MODEL,
        max_tokens: MAX_OUTPUT_TOKENS,
        system: GROUNDING_SYSTEM_PROMPT,
        messages: [
          { role: 'user', content: `${context}\n\nQuestion: ${question}` },
        ],
      });
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw new InternalServerErrorException(
          `Generation is misconfigured: ${error.message}`,
        );
      }
      if (
        error instanceof RateLimitError ||
        error instanceof APIConnectionError ||
        error instanceof InternalServerError
      ) {
        throw new ServiceUnavailableException(
          'Generation is temporarily unavailable, please try again shortly.',
        );
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(`Generation failed: ${message}`);
    }

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock) {
      throw new InternalServerErrorException(
        'Generation returned no text content.',
      );
    }

    return {
      answer: textBlock.text,
      citations,
      groundedInContext: true,
      truncated: response.stop_reason === 'max_tokens',
    };
  }
}
