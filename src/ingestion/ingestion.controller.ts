import { Body, Controller, Post } from '@nestjs/common';
import { IngestEpubDto } from './dto/ingest-epub.dto';
import { IngestionResult, IngestionService } from './ingestion.service';

@Controller('ingestion')
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post('epub')
  ingestEpub(@Body() dto: IngestEpubDto): Promise<IngestionResult> {
    return this.ingestionService.ingestEpub(dto.filePath);
  }
}
