import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { IngestEpubDto } from './ingest-epub.dto';

describe('IngestEpubDto', () => {
  it('passes validation with a valid filePath string', async () => {
    const dto = plainToInstance(IngestEpubDto, { filePath: '/book.epub' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails validation when filePath is missing', async () => {
    const dto = plainToInstance(IngestEpubDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toHaveProperty('isNotEmpty');
  });

  it('fails validation when filePath is an empty string', async () => {
    const dto = plainToInstance(IngestEpubDto, { filePath: '' });
    const errors = await validate(dto);
    expect(errors[0].constraints).toHaveProperty('isNotEmpty');
  });

  it('fails validation when filePath is not a string', async () => {
    const dto = plainToInstance(IngestEpubDto, { filePath: 42 });
    const errors = await validate(dto);
    expect(errors[0].constraints).toHaveProperty('isString');
  });
});
