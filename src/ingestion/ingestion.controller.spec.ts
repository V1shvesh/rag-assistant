import { Test, TestingModule } from '@nestjs/testing';
import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';

describe('IngestionController', () => {
  let controller: IngestionController;
  let fakeService: { ingestEpub: jest.Mock };

  beforeEach(async () => {
    fakeService = { ingestEpub: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [IngestionController],
      providers: [{ provide: IngestionService, useValue: fakeService }],
    }).compile();

    controller = module.get(IngestionController);
  });

  it('delegates to IngestionService.ingestEpub with the DTO filePath', async () => {
    fakeService.ingestEpub.mockResolvedValue({
      source: 'My Book',
      chunksInserted: 3,
    });

    const result = await controller.ingestEpub({ filePath: '/book.epub' });

    expect(fakeService.ingestEpub).toHaveBeenCalledWith('/book.epub');
    expect(result).toEqual({ source: 'My Book', chunksInserted: 3 });
  });

  it('propagates a rejection from the service', async () => {
    const error = new Error('ingestion failed');
    fakeService.ingestEpub.mockRejectedValue(error);

    await expect(
      controller.ingestEpub({ filePath: '/book.epub' }),
    ).rejects.toThrow(error);
  });
});
