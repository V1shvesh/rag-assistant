import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { RetrievalModule } from './../src/retrieval/retrieval.module';
import { RetrievalService } from './../src/retrieval/retrieval.service';
import { EmbeddingsService } from './../src/embeddings/embeddings.service';

describe('RetrievalController (e2e)', () => {
  let app: INestApplication<App>;
  const fakeRetrievalService = {
    search: jest.fn().mockResolvedValue([
      {
        id: 1,
        source: 'Project Hail Mary',
        chapterTitle: 'Chapter 9',
        text: 'Rocky is introduced here.',
        distance: 0.12,
      },
    ]),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [RetrievalModule],
    })
      .overrideProvider(RetrievalService)
      .useValue(fakeRetrievalService)
      // RetrievalModule imports EmbeddingsModule, and Nest eagerly instantiates every
      // provider it declares (even unused ones) — override it so its real constructor
      // (which needs OPENAI_API_KEY/PG_POOL) never runs in this isolated test module.
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

  it('POST /retrieval/search with a valid question calls the service and returns its result', () => {
    return request(app.getHttpServer())
      .post('/retrieval/search')
      .send({ question: 'Who is Rocky?' })
      .expect(201)
      .expect({
        question: 'Who is Rocky?',
        results: [
          {
            id: 1,
            source: 'Project Hail Mary',
            chapterTitle: 'Chapter 9',
            text: 'Rocky is introduced here.',
            distance: 0.12,
          },
        ],
      })
      .then(() => {
        expect(fakeRetrievalService.search).toHaveBeenCalledWith(
          'Who is Rocky?',
          undefined,
          undefined,
        );
      });
  });

  it('accepts optional k and source and forwards them', () => {
    return request(app.getHttpServer())
      .post('/retrieval/search')
      .send({ question: 'Who is Rocky?', k: 3, source: 'Project Hail Mary' })
      .expect(201)
      .then(() => {
        expect(fakeRetrievalService.search).toHaveBeenCalledWith(
          'Who is Rocky?',
          3,
          'Project Hail Mary',
        );
      });
  });

  it('rejects a request with a missing question', () => {
    return request(app.getHttpServer())
      .post('/retrieval/search')
      .send({})
      .expect(400);
  });

  it('rejects a request with an empty question', () => {
    return request(app.getHttpServer())
      .post('/retrieval/search')
      .send({ question: '' })
      .expect(400);
  });

  it('rejects a request with k out of range', () => {
    return request(app.getHttpServer())
      .post('/retrieval/search')
      .send({ question: 'x', k: 100 })
      .expect(400);
  });

  it('rejects a request with an unknown extra field', () => {
    return request(app.getHttpServer())
      .post('/retrieval/search')
      .send({ question: 'x', extra: 'nope' })
      .expect(400);
  });
});
