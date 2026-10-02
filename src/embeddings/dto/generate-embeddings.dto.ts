import { IsOptional, IsString } from 'class-validator';

export class GenerateEmbeddingsDto {
  @IsOptional()
  @IsString()
  source?: string;
}
