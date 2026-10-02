import { Pool } from 'pg';
import { IngestionService } from './ingestion.service';
import { EpubParserService, ParsedEpub } from './epub-parser.service';

type QueryMock = jest.Mock<Promise<{ rows: unknown[] }>, [string, unknown[]?]>;

describe('IngestionService', () => {
  let fakeClient: { query: QueryMock; release: jest.Mock };
  let fakePool: { connect: jest.Mock };
  let fakeEpubParser: { parse: jest.Mock };
  let service: IngestionService;

  beforeEach(() => {
    fakeClient = {
      query: jest.fn().mockResolvedValue({ rows: [] }) as QueryMock,
      release: jest.fn(),
    };
    fakePool = { connect: jest.fn().mockResolvedValue(fakeClient) };
    fakeEpubParser = { parse: jest.fn() };
    service = new IngestionService(
      fakePool as unknown as Pool,
      fakeEpubParser as unknown as EpubParserService,
    );
  });

  function mockParsedEpub(result: ParsedEpub) {
    fakeEpubParser.parse.mockResolvedValue(result);
  }

  it('runs BEGIN, DELETE, one INSERT per chapter, then COMMIT in order', async () => {
    mockParsedEpub({
      bookTitle: 'My Book',
      chapters: [
        { title: 'Chapter 1', text: 'one' },
        { title: 'Chapter 2', text: 'two' },
      ],
    });

    await service.ingestEpub('/book.epub');

    expect(fakeClient.query.mock.calls.map((call) => call[0])).toEqual([
      'BEGIN',
      'DELETE FROM chunks WHERE source = $1',
      'INSERT INTO chunks (source, chapter_title, text) VALUES ($1, $2, $3)',
      'INSERT INTO chunks (source, chapter_title, text) VALUES ($1, $2, $3)',
      'COMMIT',
    ]);
    expect(fakeClient.query).toHaveBeenNthCalledWith(2, expect.any(String), [
      'My Book',
    ]);
    expect(fakeClient.query).toHaveBeenNthCalledWith(3, expect.any(String), [
      'My Book',
      'Chapter 1',
      'one',
    ]);
    expect(fakeClient.query).toHaveBeenNthCalledWith(4, expect.any(String), [
      'My Book',
      'Chapter 2',
      'two',
    ]);
  });

  it('resolves with the source and chunk count', async () => {
    mockParsedEpub({
      bookTitle: 'My Book',
      chapters: [{ title: 'Chapter 1', text: 'one' }],
    });

    const result = await service.ingestEpub('/book.epub');

    expect(result).toEqual({ source: 'My Book', chunksInserted: 1 });
  });

  it('releases the client exactly once on success', async () => {
    mockParsedEpub({ bookTitle: 'My Book', chapters: [] });

    await service.ingestEpub('/book.epub');

    expect(fakeClient.release).toHaveBeenCalledTimes(1);
  });

  it('rolls back and rethrows when a query fails', async () => {
    mockParsedEpub({
      bookTitle: 'My Book',
      chapters: [{ title: 'Chapter 1', text: 'one' }],
    });
    const insertError = new Error('insert failed');
    fakeClient.query.mockImplementation((sql: string) => {
      if (sql.startsWith('INSERT')) {
        return Promise.reject(insertError);
      }
      return Promise.resolve({ rows: [] });
    });

    await expect(service.ingestEpub('/book.epub')).rejects.toThrow(insertError);

    expect(fakeClient.query.mock.calls.map((call) => call[0])).toEqual([
      'BEGIN',
      'DELETE FROM chunks WHERE source = $1',
      'INSERT INTO chunks (source, chapter_title, text) VALUES ($1, $2, $3)',
      'ROLLBACK',
    ]);
  });

  it('still releases the client when an error occurs', async () => {
    mockParsedEpub({
      bookTitle: 'My Book',
      chapters: [{ title: 'Chapter 1', text: 'one' }],
    });
    fakeClient.query.mockImplementation((sql: string) => {
      if (sql.startsWith('INSERT')) {
        return Promise.reject(new Error('insert failed'));
      }
      return Promise.resolve({ rows: [] });
    });

    await expect(service.ingestEpub('/book.epub')).rejects.toThrow();

    expect(fakeClient.release).toHaveBeenCalledTimes(1);
  });

  it('issues only BEGIN, DELETE, and COMMIT when there are no chapters', async () => {
    mockParsedEpub({ bookTitle: 'Empty Book', chapters: [] });

    const result = await service.ingestEpub('/book.epub');

    expect(fakeClient.query.mock.calls.map((call) => call[0])).toEqual([
      'BEGIN',
      'DELETE FROM chunks WHERE source = $1',
      'COMMIT',
    ]);
    expect(result).toEqual({ source: 'Empty Book', chunksInserted: 0 });
  });
});
