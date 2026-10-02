import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { SearchDto } from './search.dto';

describe('SearchDto', () => {
  it('passes validation with just a question', async () => {
    const dto = plainToInstance(SearchDto, { question: 'Who is Rocky?' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('passes validation with k and source provided', async () => {
    const dto = plainToInstance(SearchDto, {
      question: 'Who is Rocky?',
      k: 10,
      source: 'Project Hail Mary',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails validation when question is missing', async () => {
    const dto = plainToInstance(SearchDto, {});
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'question')).toBe(true);
  });

  it('fails validation when question is an empty string', async () => {
    const dto = plainToInstance(SearchDto, { question: '' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'question')).toBe(true);
  });

  it('fails validation when k is below the minimum', async () => {
    const dto = plainToInstance(SearchDto, { question: 'x', k: 0 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'k')).toBe(true);
  });

  it('fails validation when k is above the maximum', async () => {
    const dto = plainToInstance(SearchDto, { question: 'x', k: 21 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'k')).toBe(true);
  });

  it('fails validation when k is not an integer', async () => {
    const dto = plainToInstance(SearchDto, { question: 'x', k: 1.5 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'k')).toBe(true);
  });

  it('fails validation when source is not a string', async () => {
    const dto = plainToInstance(SearchDto, { question: 'x', source: 42 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'source')).toBe(true);
  });
});
