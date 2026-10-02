import { Test, TestingModule } from '@nestjs/testing';
import { GenerationController } from './generation.controller';
import { GenerationService } from './generation.service';

describe('GenerationController', () => {
  let controller: GenerationController;
  let fakeService: { answer: jest.Mock };

  beforeEach(async () => {
    fakeService = { answer: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GenerationController],
      providers: [{ provide: GenerationService, useValue: fakeService }],
    }).compile();

    controller = module.get(GenerationController);
  });

  it('delegates to GenerationService.answer with the DTO fields', async () => {
    fakeService.answer.mockResolvedValue({
      answer: 'Rocky is an alien engineer.',
      citations: ['Chapter 9'],
      groundedInContext: true,
      truncated: false,
    });

    const result = await controller.answer({
      question: 'Who is Rocky?',
      k: 3,
      source: 'Project Hail Mary',
    });

    expect(fakeService.answer).toHaveBeenCalledWith(
      'Who is Rocky?',
      3,
      'Project Hail Mary',
    );
    expect(result).toEqual({
      answer: 'Rocky is an alien engineer.',
      citations: ['Chapter 9'],
      groundedInContext: true,
      truncated: false,
    });
  });

  it('propagates a rejection from the service', async () => {
    const error = new Error('generation failed');
    fakeService.answer.mockRejectedValue(error);

    await expect(controller.answer({ question: 'x' })).rejects.toThrow(error);
  });
});
