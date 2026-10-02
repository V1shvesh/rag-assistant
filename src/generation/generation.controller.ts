import { Body, Controller, Post } from '@nestjs/common';
import { AskDto } from './dto/ask.dto';
import { GenerationResult, GenerationService } from './generation.service';

@Controller('generation')
export class GenerationController {
  constructor(private readonly generationService: GenerationService) {}

  @Post('ask')
  answer(@Body() dto: AskDto): Promise<GenerationResult> {
    return this.generationService.answer(dto.question, dto.k, dto.source);
  }
}
