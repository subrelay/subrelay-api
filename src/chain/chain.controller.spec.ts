import { Test, TestingModule } from '@nestjs/testing';
import { ChainController } from './chain.controller';
import { ChainService } from './chain.service';
import { EventService } from '../event/event.service';
import { CreateChainRequest, UpdateChainRequest } from './chain.dto';
import { Chain } from './chain.entity';
import { GetEventsQueryParams } from '../event/event.dto';

describe('ChainController', () => {
  let controller: ChainController;
  let chainService: ChainService;
  let eventService: EventService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChainController],
      providers: [
        {
          provide: ChainService,
          useValue: {
            getChains: jest.fn(() => []),
            createChain: jest.fn(() => ({ success: true, output: {} })),
            deleteChainByChainId: jest.fn(),
            chainExist: jest.fn(() => true),
            updateChain: jest.fn(),
          },
        },
        {
          provide: EventService,
          useValue: {
            getEventsByChain: jest.fn(() => []),
            getEventByChain: jest.fn(() => {}),
          },
        },
      ],
    }).compile();

    controller = module.get<ChainController>(ChainController);
    chainService = module.get<ChainService>(ChainService);
    eventService = module.get<EventService>(EventService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getChains', () => {
    it('should return an array of chains', async () => {
      const expectedResult: Chain[] = [{ id: 1, name: 'Chain 1' }];
      jest.spyOn(chainService, 'getChains').mockResolvedValue(expectedResult);

      const result = await controller.getChains();

      expect(result).toBe(expectedResult);
      expect(chainService.getChains).toHaveBeenCalled();
    });
  });

  describe('createChain', () => {
    it('should create a new chain and return it', async () => {
      const input: CreateChainRequest = { name: 'Chain 1', image: 'chain.png' };
      const expectedResult: Chain = { id: 1, name: 'Chain 1', image: 'chain.png' };
      jest.spyOn(chainService, 'createChain').mockResolvedValue({ success: true, output: expectedResult });

      const result = await controller.createChain(input);

      expect(result).toBe(expectedResult);
      expect(chainService.createChain).toHaveBeenCalledWith(input);
    });

    it('should throw an InternalServerErrorException if creating the chain fails', async () => {
      const input: CreateChainRequest = { name: 'Chain 1', image: 'chain.png' };
      const error = new Error('Creating chain failed');
      jest.spyOn(chainService, 'createChain').mockResolvedValue({ success: false, error });

      await expect(controller.createChain(input)).rejects.toThrowError(new InternalServerErrorException(error.message));
      expect(chainService.createChain).toHaveBeenCalledWith(input);
    });
  });

  describe('deleteChain', () => {
    it('should delete a chain by its ID', async () => {
      const chainId = '1';
      await controller.deleteChain({ chainId });

      expect(chainService.deleteChainByChainId).toHaveBeenCalledWith(chainId);
    });
  });
}
