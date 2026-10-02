import { Module } from '@nestjs/common';
import { RetrievalModule } from '../retrieval/retrieval.module';
import { GenerationController } from './generation.controller';
import { GenerationService } from './generation.service';

@Module({
  imports: [RetrievalModule],
  controllers: [GenerationController],
  providers: [GenerationService],
})
export class GenerationModule {}
