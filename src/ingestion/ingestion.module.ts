import { Module } from '@nestjs/common';
import { EpubParserService } from './epub-parser.service';
import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';

@Module({
  controllers: [IngestionController],
  providers: [EpubParserService, IngestionService],
})
export class IngestionModule {}
