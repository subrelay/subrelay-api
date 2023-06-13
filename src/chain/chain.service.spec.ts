import { Test, TestingModule } from '@nestjs/testing';
import { ChainService } from './chain.service';
import { ChainEntity } from './chain.entity';
import { SubstrateService } from '../substrate/substrate.service';
import { EventService } from '../event/event.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEntity } from '../event/event.entity';
import { UserInputError } from '../common/error.type';

describe('ChainService', () => {
  let service: ChainService;
  let chainRepository: Repository<ChainEntity>;
  let substrateService: SubstrateService;
  let eventService: EventService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChainService,
        SubstrateService,
        EventService,
        {
          provide: getRepositoryToken(ChainEntity),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(EventEntity),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<ChainService>(ChainService);
    chainRepository = module.get<Repository<ChainEntity>>(
      getRepositoryToken(ChainEntity),
    );
    substrateService = module.get<SubstrateService>(SubstrateService);
    eventService = module.get<EventService>(EventService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getChainsByEventIds', () => {
    it('should return an array of chainIds and configs', async () => {
      const mockChainEntity = {
        chainId: 'kusama',
        config: {
          rpcs: ['wss://kusama-rpc.polkadot.io'],
          chainTokens: ['KSM'],
          chainDecimals: [12],
          metadataVersion: 14,
        },
      };
      jest.spyOn(chainRepository, 'createQueryBuilder').mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValueOnce([mockChainEntity]),
      } as any);
      const result = await service.getChainsByEventIds(['test-event-id']);

      expect(result).toEqual([mockChainEntity]);
    });
  });

  describe('getChains', () => {
    it('should return an array of ChainSummary', async () => {
      const mockChainSummary = {
        uuid: '01H2QCFESCHJAHDJV1BRFKE2PQ',
        name: '01H2S828695SQJ8PV131Y45RA7',
        createdAt: '2023-06-12T01:45:05.201Z',
        version: '9420',
        imageUrl:
          'https://01H2S82869WS23KJ6CF8PGKXRP.com/01H2S828691ZCXQAHVG9TAKMKC.png',
        chainId: 'kusama',
      };
      jest.spyOn(chainRepository, 'createQueryBuilder').mockReturnValue({
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValueOnce([mockChainSummary]),
      } as any);
      const result = await service.getChains();
      expect(result).toEqual([mockChainSummary]);
    });
  });

  describe('chainExist', () => {
    it('should return true when a chain with the given uuid exists', async () => {
      const mockCountBy = jest.spyOn(chainRepository, 'countBy');
      mockCountBy.mockResolvedValueOnce(1);
      const result = await service.chainExist('test-uuid');
      expect(result).toBe(true);
      expect(mockCountBy).toHaveBeenCalledWith({ uuid: 'test-uuid' });
    });
  });

  describe('deleteChainByChainId', () => {
    it('should return true when a chain with the given id exists', async () => {
      const mockCountBy = jest.spyOn(chainRepository, 'countBy');
      mockCountBy.mockResolvedValueOnce(1);
      const result = await service.chainExistByChainId('test-uuid');
      expect(result).toBe(true);
      expect(mockCountBy).toHaveBeenCalledWith({ chainId: 'test-uuid' });
    });
  });

  describe('updateChain', () => {
    it('should update the chain and return a summary', async () => {
      const mockSave = jest.spyOn(chainRepository, 'save');
      const uuid = 'chain-uuid';
      const input = {
        name: 'new-chain-name',
        imageUrl: 'https://example.com/img.pgn',
      };
      const savedChain = {
        uuid,
        name: '01H2S828695SQJ8PV131Y45RA7',
        createdAt: '2023-06-12T01:45:05.201Z',
        version: '9420',
        imageUrl:
          'https://01H2S82869WS23KJ6CF8PGKXRP.com/01H2S828691ZCXQAHVG9TAKMKC.png',
        chainId: 'kusama',
        config: {
          rpcs: ['wss://kusama-rpc.polkadot.io'],
          chainTokens: ['KSM'],
          chainDecimals: [12],
          metadataVersion: 14,
        },
        events: [],
      };
      mockSave.mockResolvedValueOnce(savedChain);

      const result = await service.updateChain(uuid, input);

      expect(mockSave).toHaveBeenCalledWith({ uuid, ...input });
      expect(result).toEqual(savedChain);
    });
  });

  describe('createChain', () => {
    const mockChainInfo = {
      chainId: 'testChainId',
      runtimeVersion: '1.0.0',
      chainDecimals: 18,
      chainTokens: ['token1', 'token2'],
      metadataVersion: '1.0.0',
      events: ['event1', 'event2'],
    };
    const mockValidRpcs = ['http://localhost:1234', 'http://localhost:5678'];
    const mockInput = {
      name: 'testChain',
      imageUrl: 'http://test.com/test.png',
      rpcs: ['http://localhost:1234', 'http://localhost:5678'],
    };

    // it('should create a chain successfully', async () => {
    //   const mockInsertChain = jest.fn().mockResolvedValueOnce('createdChain');
    //   const mockChainExistByChainId = jest.fn().mockResolvedValueOnce(false);
    //   const mockGetChainInfoByRpcs = jest.fn().mockResolvedValueOnce({
    //     chainInfo: mockChainInfo,
    //     validRpcs: mockValidRpcs,
    //   });
    //   const mockCreateEvents = jest.fn().mockResolvedValueOnce('createdEvents');

    //   const chainService = new ChainService(
    //     {
    //       insertChain: mockInsertChain,
    //       chainExistByChainId: mockChainExistByChainId,
    //     },
    //     { getChainInfoByRpcs: mockGetChainInfoByRpcs },
    //     { createEvents: mockCreateEvents },
    //   );

    //   const expectedChain = {
    //     uuid: expect.any(String),
    //     name: mockInput.name,
    //     imageUrl: mockInput.imageUrl,
    //     version: mockChainInfo.runtimeVersion,
    //     chainId: mockChainInfo.chainId,
    //     config: {
    //       chainDecimals: mockChainInfo.chainDecimals,
    //       chainTokens: mockChainInfo.chainTokens,
    //       metadataVersion: mockChainInfo.metadataVersion,
    //       rpcs: mockValidRpcs,
    //     },
    //   };

    //   const result = await chainService.createChain(mockInput);

    //   expect(mockGetChainInfoByRpcs).toHaveBeenCalledWith(mockInput.rpcs);
    //   expect(mockChainExistByChainId).toHaveBeenCalledWith(
    //     mockChainInfo.chainId,
    //   );
    //   expect(mockInsertChain).toHaveBeenCalledWith(expectedChain);
    //   expect(mockCreateEvents).toHaveBeenCalledWith(
    //     mockChainInfo.events,
    //     expectedChain.uuid,
    //   );
    //   expect(result).toEqual('createdChain');
    // });

    it('should throw an error if chain already exists', async () => {
      const input = {
        name: 'test-chain',
        imageUrl: 'http://test.com/test.png',
        rpcs: ['http://localhost:1234'],
      };
      const mockGetChainInfoByRpcs = jest
        .spyOn(service, <any>'getChainInfoByRpcs')
        .mockResolvedValueOnce({
          chainInfo: {
            chainId: 'chain-id',
          },
          validRpcs: input.rpcs,
          invalidRpcs: null,
        });

      const mockChainExistByChainId = jest
        .spyOn(service, 'chainExistByChainId')
        .mockResolvedValueOnce(true);

      await expect(service.createChain(input)).rejects.toThrowError(
        '"chain-id" exists',
      );
      expect(mockGetChainInfoByRpcs).toHaveBeenCalled();
      expect(mockChainExistByChainId).toHaveBeenCalled();
    });

    it('should throw an error if chain info cannot be retrieved', async () => {
      const input = {
        name: 'test-chain',
        imageUrl: 'http://test.com/test.png',
        rpcs: ['http://localhost:1234'],
      };
      const mockGetChainInfoByRpcs = jest
        .spyOn(service, <any>'getChainInfoByRpcs')
        .mockResolvedValueOnce({
          chainInfo: null,
          validRpcs: null,
          invalidRpcs: input.rpcs,
        });

      await expect(service.createChain(input)).rejects.toThrowError(
        'Cannot connect to provider by urls in rpcs',
      );
      expect(mockGetChainInfoByRpcs).toHaveBeenCalled();
    });
  });
});
