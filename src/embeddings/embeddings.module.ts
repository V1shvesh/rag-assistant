import { Module } from '@nestjs/common';
import { EmbeddingsController } from './embeddings.controller';
import { EmbeddingsRateLimiter } from './embeddings-rate-limiter';
import { EmbeddingsService } from './embeddings.service';

@Module({
  controllers: [EmbeddingsController],
  providers: [EmbeddingsService, EmbeddingsRateLimiter],
  exports: [EmbeddingsService],
})
export class EmbeddingsModule {}
