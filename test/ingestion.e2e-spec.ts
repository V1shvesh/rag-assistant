import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { IngestionModule } from './../src/ingestion/ingestion.module';
import { IngestionService } from './../src/ingestion/ingestion.service';

describe('IngestionController (e2e)', () => {
  let app: INestApplication<App>;
  const fakeIngestionService = {
    ingestEpub: jest
      .fn()
      .mockResolvedValue({ source: 'My Book', chunksInserted: 3 }),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [IngestionModule],
    })
      .overrideProvider(IngestionService)
      .useValue(fakeIngestionService)
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

  it('POST /ingestion/epub with a valid filePath calls the service and returns its result', () => {
    return request(app.getHttpServer())
      .post('/ingestion/epub')
      .send({ filePath: 'data/book.epub' })
      .expect(201)
      .expect({ source: 'My Book', chunksInserted: 3 })
      .then(() => {
        expect(fakeIngestionService.ingestEpub).toHaveBeenCalledWith(
          'data/book.epub',
        );
      });
  });

  it('rejects a request with a missing filePath', () => {
    return request(app.getHttpServer())
      .post('/ingestion/epub')
      .send({})
      .expect(400);
  });

  it('rejects a request with an empty filePath', () => {
    return request(app.getHttpServer())
      .post('/ingestion/epub')
      .send({ filePath: '' })
      .expect(400);
  });

  it('rejects a request with an unknown extra field', () => {
    return request(app.getHttpServer())
      .post('/ingestion/epub')
      .send({ filePath: 'data/book.epub', extra: 'nope' })
      .expect(400);
  });
});
