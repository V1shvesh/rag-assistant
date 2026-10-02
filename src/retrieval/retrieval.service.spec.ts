import { Pool } from 'pg';
import { RetrievalService } from './retrieval.service';
import { EmbeddingsService } from '../embeddings/embeddings.service';

describe('RetrievalService', () => {
  let fakeEmbeddingsService: { embed: jest.Mock };
  let fakePool: { query: jest.Mock };
  let service: RetrievalService;

  beforeEach(() => {
    fakeEmbeddingsService = {
      embed: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    };
    fakePool = {
      query: jest.fn().mockResolvedValue({
        rows: [
          {
            id: 1,
            source: 'Project Hail Mary',
            chapter_title: 'Chapter 1',
            text: 'hi',
            distance: 0.1,
          },
        ],
      }),
    };
    service = new RetrievalService(
      fakeEmbeddingsService as unknown as EmbeddingsService,
      fakePool as unknown as Pool,
    );
  });

  it('embeds the question via EmbeddingsService before querying', async () => {
    await service.search('Who is Rocky?');

    expect(fakeEmbeddingsService.embed).toHaveBeenCalledWith('Who is Rocky?');
  });

  it('queries chunks ordered by cosine distance, casting the vector param', async () => {
    await service.search('Who is Rocky?');

    const [sql, params] = fakePool.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('embedding <=> $1::vector');
    expect(sql).toContain('ORDER BY embedding <=> $1::vector');
    expect(sql).toContain('WHERE embedding IS NOT NULL');
    expect(params[0]).toBe('[0.1,0.2,0.3]');
  });

  it('defaults k to 5 and passes no source filter when omitted', async () => {
    await service.search('Who is Rocky?');

    const [, params] = fakePool.query.mock.calls[0] as [string, unknown[]];
    expect(params[1]).toBeNull();
    expect(params[2]).toBe(5);
  });

  it('passes a custom k and source through to the query', async () => {
    await service.search('Who is Rocky?', 10, 'Project Hail Mary');

    const [, params] = fakePool.query.mock.calls[0] as [string, unknown[]];
    expect(params[1]).toBe('Project Hail Mary');
    expect(params[2]).toBe(10);
  });

  it('maps rows into RetrievedChunk shape', async () => {
    const results = await service.search('Who is Rocky?');

    expect(results).toEqual([
      {
        id: 1,
        source: 'Project Hail Mary',
        chapterTitle: 'Chapter 1',
        text: 'hi',
        distance: 0.1,
      },
    ]);
  });
});
