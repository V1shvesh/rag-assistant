import { Body, Controller, Post } from '@nestjs/common';
import { SearchDto } from './dto/search.dto';
import { RetrievalService, RetrievedChunk } from './retrieval.service';

export interface SearchResponse {
  question: string;
  results: RetrievedChunk[];
}

@Controller('retrieval')
export class RetrievalController {
  constructor(private readonly retrievalService: RetrievalService) {}

  @Post('search')
  async search(@Body() dto: SearchDto): Promise<SearchResponse> {
    const results = await this.retrievalService.search(
      dto.question,
      dto.k,
      dto.source,
    );
    return { question: dto.question, results };
  }
}
