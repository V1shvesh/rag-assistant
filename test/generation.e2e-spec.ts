import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { GenerationModule } from './../src/generation/generation.module';
import { GenerationService } from './../src/generation/generation.service';
import { RetrievalService } from './../src/retrieval/retrieval.service';
import { EmbeddingsService } from './../src/embeddings/embeddings.service';

describe('GenerationController (e2e)', () => {
  let app: INestApplication<App>;
  const fakeGenerationService = {
    answer: jest.fn().mockResolvedValue({
      answer: 'Rocky is an alien engineer introduced in Chapter 9.',
      citations: ['Chapter 9'],
      groundedInContext: true,
      truncated: false,
    }),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [GenerationModule],
    })
      .overrideProvider(GenerationService)
      .useValue(fakeGenerationService)
      // GenerationModule imports RetrievalModule, which imports EmbeddingsModule — Nest
      // eagerly instantiates every provider in that graph regardless of overrides further
      // up the chain, so both nested real services must be stubbed too (see GOTCHA.md).
      .overrideProvider(RetrievalService)
      .useValue({ search: jest.fn() })
      .overrideProvider(EmbeddingsService)
      .useValue({ embed: jest.fn() })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST /generation/ask with a valid question calls the service and returns its result', () => {
    return request(app.getHttpServer())
      .post('/generation/ask')
      .send({ question: 'Who is Rocky?' })
      .expect(201)
      .expect({
        answer: 'Rocky is an alien engineer introduced in Chapter 9.',
        citations: ['Chapter 9'],
        groundedInContext: true,
        truncated: false,
      })
      .then(() => {
        expect(fakeGenerationService.answer).toHaveBeenCalledWith(
          'Who is Rocky?',
          undefined,
          undefined,
        );
      });
  });

  it('accepts optional k and source and forwards them', () => {
    return request(app.getHttpServer())
      .post('/generation/ask')
      .send({ question: 'Who is Rocky?', k: 3, source: 'Project Hail Mary' })
      .expect(201)
      .then(() => {
        expect(fakeGenerationService.answer).toHaveBeenCalledWith(
          'Who is Rocky?',
          3,
          'Project Hail Mary',
        );
      });
  });

  it('rejects a request with a missing question', () => {
    return request(app.getHttpServer())
      .post('/generation/ask')
      .send({})
      .expect(400);
  });

  it('rejects a request with an empty question', () => {
    return request(app.getHttpServer())
      .post('/generation/ask')
      .send({ question: '' })
      .expect(400);
  });

  it('rejects a request with k out of range', () => {
    return request(app.getHttpServer())
      .post('/generation/ask')
      .send({ question: 'x', k: 100 })
      .expect(400);
  });

  it('rejects a request with an unknown extra field', () => {
    return request(app.getHttpServer())
      .post('/generation/ask')
      .send({ question: 'x', extra: 'nope' })
      .expect(400);
  });
});
