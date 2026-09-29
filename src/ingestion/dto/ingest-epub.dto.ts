import { IsNotEmpty, IsString } from 'class-validator';

export class IngestEpubDto {
  @IsString()
  @IsNotEmpty()
  filePath: string;
}
