import { EpubParserService } from './epub-parser.service';

type FlowItem = { id?: string; title?: string };

interface FakeEpubConfig {
  metadata: { title?: string };
  flow: FlowItem[];
  chapters: Record<string, string | Error>;
  parseError?: Error;
}

let fakeConfig: FakeEpubConfig;

jest.mock('epub2', () => {
  class FakeEPub {
    metadata: { title?: string };
    flow: FlowItem[];
    private listeners = new Map<string, (arg?: unknown) => void>();

    constructor(public filePath: string) {
      this.metadata = fakeConfig.metadata;
      this.flow = fakeConfig.flow;
    }

    on(event: string, cb: (arg?: unknown) => void) {
      this.listeners.set(event, cb);
      return this;
    }

    parse() {
      if (fakeConfig.parseError) {
        this.listeners.get('error')?.(fakeConfig.parseError);
      } else {
        this.listeners.get('end')?.();
      }
      return this;
    }

    getChapterRaw(
      chapterId: string,
      callback: (error: Error | null, text?: string) => void,
    ) {
      const result = fakeConfig.chapters[chapterId];
      if (result instanceof Error) {
        callback(result);
      } else {
        callback(null, result);
      }
    }
  }

  return { EPub: FakeEPub };
});

describe('EpubParserService', () => {
  const service = new EpubParserService();

  beforeEach(() => {
    fakeConfig = {
      metadata: { title: 'My Book' },
      flow: [],
      chapters: {},
    };
  });

  it('uses the epub metadata title as bookTitle', async () => {
    fakeConfig.metadata.title = 'Project Hail Mary';
    const result = await service.parse('/books/project-hail-mary.epub');
    expect(result.bookTitle).toBe('Project Hail Mary');
  });

  it('falls back to a filename-derived title when metadata has no title', async () => {
    fakeConfig.metadata.title = undefined;
    const result = await service.parse('/books/some file.epub');
    expect(result.bookTitle).toBe('some file');
  });

  it('skips flow items with no id', async () => {
    fakeConfig.flow = [
      { id: undefined, title: 'Ghost' },
      { id: 'c1', title: 'Chapter 1' },
    ];
    fakeConfig.chapters = { c1: '<p>Real content</p>' };
    const result = await service.parse('/book.epub');
    expect(result.chapters).toEqual([
      { title: 'Chapter 1', text: 'Real content' },
    ]);
  });

  it('skips chapters whose converted text is empty', async () => {
    fakeConfig.flow = [
      { id: 'cover', title: 'Cover' },
      { id: 'c1', title: 'Chapter 1' },
    ];
    fakeConfig.chapters = {
      cover: '<img src="cover.jpg">',
      c1: '<p>Real content</p>',
    };
    const result = await service.parse('/book.epub');
    expect(result.chapters).toEqual([
      { title: 'Chapter 1', text: 'Real content' },
    ]);
  });

  it('falls back to "Untitled section N" using the original flow index when a title is missing', async () => {
    fakeConfig.flow = [
      { id: 'cover', title: 'Cover' },
      { id: 'c1', title: undefined },
    ];
    fakeConfig.chapters = {
      cover: '<p>Cover text</p>',
      c1: '<p>Chapter text</p>',
    };
    const result = await service.parse('/book.epub');
    expect(result.chapters[1]).toEqual({
      title: 'Untitled section 2',
      text: 'Chapter text',
    });
  });

  it('strips images and link hrefs from converted chapter text', async () => {
    fakeConfig.flow = [{ id: 'c1', title: 'Chapter 1' }];
    fakeConfig.chapters = {
      c1: '<p>Before <img src="x.png"> after.</p><p><a href="http://example.com">link text</a></p>',
    };
    const result = await service.parse('/book.epub');
    const text = result.chapters[0].text;
    expect(text).not.toContain('http://example.com');
    expect(text).not.toContain('x.png');
    expect(text).toContain('Before');
    expect(text).toContain('after.');
    expect(text).toContain('link text');
  });

  it('propagates an error from getChapterRaw', async () => {
    fakeConfig.flow = [{ id: 'c1', title: 'Chapter 1' }];
    const chapterError = new Error('corrupt chapter');
    fakeConfig.chapters = { c1: chapterError };

    await expect(service.parse('/book.epub')).rejects.toThrow(chapterError);
  });

  it('preserves flow order in the returned chapters', async () => {
    fakeConfig.flow = [
      { id: 'c1', title: 'Chapter 1' },
      { id: 'c2', title: 'Chapter 2' },
      { id: 'c3', title: 'Chapter 3' },
    ];
    fakeConfig.chapters = {
      c1: '<p>one</p>',
      c2: '<p>two</p>',
      c3: '<p>three</p>',
    };
    const result = await service.parse('/book.epub');
    expect(result.chapters.map((c) => c.title)).toEqual([
      'Chapter 1',
      'Chapter 2',
      'Chapter 3',
    ]);
  });
});
