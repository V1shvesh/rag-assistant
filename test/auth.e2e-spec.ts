import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { GenerationService } from './../src/generation/generation.service';
import { RetrievalService } from './../src/retrieval/retrieval.service';
import { EmbeddingsService } from './../src/embeddings/embeddings.service';
import { SupabaseJwtService } from './../src/auth/supabase-jwt.service';

// This spec boots the full AppModule (unlike the other e2e specs, which
// each import only one feature module) because the global auth guard is
// only registered once AppModule itself is compiled — see GOTCHA.md.
describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  const fakeGenerationService = {
    answer: jest.fn().mockResolvedValue({
      answer: 'Rocky is an alien engineer.',
      citations: ['Chapter 9'],
      groundedInContext: true,
      truncated: false,
    }),
  };
  const fakeJwtService = { verify: jest.fn() };

  beforeEach(async () => {
    fakeJwtService.verify.mockReset();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GenerationService)
      .useValue(fakeGenerationService)
      .overrideProvider(RetrievalService)
      .useValue({ search: jest.fn() })
      .overrideProvider(EmbeddingsService)
      .useValue({ embed: jest.fn() })
      .overrideProvider(SupabaseJwtService)
      .useValue(fakeJwtService)
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

  it('allows the public health route with no token', () => {
    return request(app.getHttpServer()).get('/').expect(200);
  });

  it('rejects a protected route with no Authorization header', () => {
    return request(app.getHttpServer())
      .post('/generation/ask')
      .send({ question: 'Who is Rocky?' })
      .expect(401);
  });

  it('rejects a protected route with a malformed Authorization header', () => {
    return request(app.getHttpServer())
      .post('/generation/ask')
      .set('Authorization', 'Token not-a-bearer-token')
      .send({ question: 'Who is Rocky?' })
      .expect(401);
  });

  it('rejects a protected route when token verification fails', () => {
    fakeJwtService.verify.mockRejectedValue(new Error('bad signature'));

    return request(app.getHttpServer())
      .post('/generation/ask')
      .set('Authorization', 'Bearer invalid-token')
      .send({ question: 'Who is Rocky?' })
      .expect(401);
  });

  it('allows a protected route through with a valid token', () => {
    fakeJwtService.verify.mockResolvedValue({
      id: 'user-123',
      email: 'a@b.com',
      role: 'authenticated',
    });

    return request(app.getHttpServer())
      .post('/generation/ask')
      .set('Authorization', 'Bearer valid-token')
      .send({ question: 'Who is Rocky?' })
      .expect(201)
      .expect({
        answer: 'Rocky is an alien engineer.',
        citations: ['Chapter 9'],
        groundedInContext: true,
        truncated: false,
      });
  });
});
