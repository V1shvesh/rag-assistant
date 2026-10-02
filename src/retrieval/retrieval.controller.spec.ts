import { Test, TestingModule } from '@nestjs/testing';
import { RetrievalController } from './retrieval.controller';
import { RetrievalService } from './retrieval.service';

describe('RetrievalController', () => {
  let controller: RetrievalController;
  let fakeService: { search: jest.Mock };

  beforeEach(async () => {
    fakeService = { search: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RetrievalController],
      providers: [{ provide: RetrievalService, useValue: fakeService }],
    }).compile();

    controller = module.get(RetrievalController);
  });

  it('delegates to RetrievalService.search with the DTO fields', async () => {
    fakeService.search.mockResolvedValue([
      { id: 1, source: 's', chapterTitle: 'c', text: 't', distance: 0.2 },
    ]);

    const result = await controller.search({
      question: 'Who is Rocky?',
      k: 3,
      source: 'Project Hail Mary',
    });

    expect(fakeService.search).toHaveBeenCalledWith(
      'Who is Rocky?',
      3,
      'Project Hail Mary',
    );
    expect(result).toEqual({
      question: 'Who is Rocky?',
      results: [
        { id: 1, source: 's', chapterTitle: 'c', text: 't', distance: 0.2 },
      ],
    });
  });

  it('propagates a rejection from the service', async () => {
    const error = new Error('search failed');
    fakeService.search.mockRejectedValue(error);

    await expect(controller.search({ question: 'x' })).rejects.toThrow(error);
  });
});
