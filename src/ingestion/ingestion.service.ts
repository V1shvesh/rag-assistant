import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { EpubParserService } from './epub-parser.service';

export interface IngestionResult {
  source: string;
  chunksInserted: number;
}

@Injectable()
export class IngestionService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly epubParser: EpubParserService,
  ) {}

  async ingestEpub(filePath: string): Promise<IngestionResult> {
    const { bookTitle, chapters } = await this.epubParser.parse(filePath);

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      // Re-running ingestion for the same book replaces its chunks rather than duplicating them.
      await client.query('DELETE FROM chunks WHERE source = $1', [bookTitle]);
      for (const chapter of chapters) {
        await client.query(
          'INSERT INTO chunks (source, chapter_title, text) VALUES ($1, $2, $3)',
          [bookTitle, chapter.title, chapter.text],
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return { source: bookTitle, chunksInserted: chapters.length };
  }
}
