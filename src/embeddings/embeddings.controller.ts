import { Body, Controller, Post } from '@nestjs/common';
import { GenerateEmbeddingsDto } from './dto/generate-embeddings.dto';
import { EmbeddingRunResult, EmbeddingsService } from './embeddings.service';

@Controller('embeddings')
export class EmbeddingsController {
  constructor(private readonly embeddingsService: EmbeddingsService) {}

  @Post('generate')
  generate(@Body() dto: GenerateEmbeddingsDto): Promise<EmbeddingRunResult> {
    return this.embeddingsService.generateForChunks(dto.source);
  }
}
