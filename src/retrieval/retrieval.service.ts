import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import pgvector from 'pgvector';
import { PG_POOL } from '../database/database.module';
import { EmbeddingsService } from '../embeddings/embeddings.service';

export interface RetrievedChunk {
  id: number;
  source: string;
  chapterTitle: string;
  text: string;
  distance: number;
}

interface ChunkRow {
  id: number;
  source: string;
  chapter_title: string;
  text: string;
  distance: number;
}

const DEFAULT_K = 5;

@Injectable()
export class RetrievalService {
  constructor(
    private readonly embeddingsService: EmbeddingsService,
    @Inject(PG_POOL) private readonly pool: Pool,
  ) {}

  async search(
    question: string,
    k = DEFAULT_K,
    source?: string,
  ): Promise<RetrievedChunk[]> {
    const queryVector = await this.embeddingsService.embed(question);

    const result = await this.pool.query<ChunkRow>(
      `SELECT id, source, chapter_title, text, (embedding <=> $1::vector) AS distance
       FROM chunks
       WHERE embedding IS NOT NULL AND ($2::text IS NULL OR source = $2)
       ORDER BY embedding <=> $1::vector
       LIMIT $3`,
      [pgvector.toSql(queryVector), source ?? null, k],
    );

    return result.rows.map((row) => ({
      id: row.id,
      source: row.source,
      chapterTitle: row.chapter_title,
      text: row.text,
      distance: row.distance,
    }));
  }
}
