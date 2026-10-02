import { Injectable } from '@nestjs/common';
import { EPub } from 'epub2';
import { convert } from 'html-to-text';
import * as path from 'path';

export interface ParsedChapter {
  title: string;
  text: string;
}

export interface ParsedEpub {
  bookTitle: string;
  chapters: ParsedChapter[];
}

@Injectable()
export class EpubParserService {
  async parse(filePath: string): Promise<ParsedEpub> {
    const epub = await this.openEpub(filePath);
    const bookTitle =
      epub.metadata.title ?? path.basename(filePath, path.extname(filePath));

    const chapters: ParsedChapter[] = [];
    for (const [index, item] of epub.flow.entries()) {
      if (!item.id) {
        continue;
      }
      const html = await this.getChapterRaw(epub, item.id);
      const text = this.htmlToPlainText(html);
      if (!text) {
        continue;
      }
      chapters.push({
        title: item.title ?? `Untitled section ${index + 1}`,
        text,
      });
    }

    return { bookTitle, chapters };
  }

  private openEpub(filePath: string): Promise<EPub> {
    return new Promise((resolve, reject) => {
      const epub = new EPub(filePath);
      epub.on('end', () => resolve(epub));
      epub.on('error', (error: Error) => reject(error));
      epub.parse();
    });
  }

  private getChapterRaw(epub: EPub, chapterId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      epub.getChapterRaw(chapterId, (error, text) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(text ?? '');
      });
    });
  }

  private htmlToPlainText(html: string): string {
    return convert(html, {
      wordwrap: false,
      selectors: [
        { selector: 'img', format: 'skip' },
        { selector: 'a', options: { ignoreHref: true } },
      ],
    }).trim();
  }
}
