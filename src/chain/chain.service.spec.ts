import { Test, TestingModule } from '@nestjs/testing';
import { ChainService } from './chain.service';
import { ChainEntity } from './chain.entity';
import { SubstrateService } from '../substrate/substrate.service';
import { EventService } from '../event/event.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEntity } from '../event/event.entity';
import { GeneralTypeEnum } from '../substrate/substrate.data';
import { ApiPromise } from '@polkadot/api';

describe('ChainService', () => {
  let service: ChainService;
  let chainRepository: Repository<ChainEntity>;
  let substrateService: SubstrateService;
  let eventService: EventService;

  const mockChainSummary = {
    uuid: '01H2QCFESCHJAHDJV1BRFKE2PQ',
    name: '01H2S828695SQJ8PV131Y45RA7',
    createdAt: '2023-06-12T01:45:05.201Z',
    version: '9420',
    imageUrl:
      'https://01H2S82869WS23KJ6CF8PGKXRP.com/01H2S828691ZCXQAHVG9TAKMKC.png',
    chainId: 'kusama',
  };

  const mockEventEntity: EventEntity = {
    id: '01H2QCFESN1HQD9C2WZ2G3XNCF',
    name: 'balances.Deposit',
    description: 'Some amount was deposited (e.g. for transaction fees).',
    chainUuid: mockChainSummary.uuid,
    index: 7,
    schema: [
      {
        name: 'who',
        type: GeneralTypeEnum.STRING,
        example: '2UbGKDKa9Au5h3qYPsiKYFazNGWViMn38yBw',
        typeName: 'T::AccountId',
        description: '',
        originalType: 'AccountId32',
      },
      {
        name: 'amount',
        type: GeneralTypeEnum.NUMBER,
        example: 44000,
        typeName: 'T::Balance',
        description: '',
        originalType: 'u128',
      },
    ],
  };

  const mockChainEntity: ChainEntity = {
    ...mockChainSummary,
    config: {
      rpcs: ['wss://kusama-rpc.polkadot.io', 'wss://polkadot-rpc.polkadot.io'],
      chainTokens: ['KSM'],
      chainDecimals: [12],
      metadataVersion: 14,
    },
    events: [mockEventEntity],
  };

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
      const input = {
        name: 'new-chain-name',
        imageUrl: 'https://example.com/img.pgn',
      };
      mockSave.mockResolvedValueOnce(mockChainEntity);

      const result = await service.updateChain(mockChainEntity.uuid, input);

      expect(mockSave).toHaveBeenCalledWith({
        uuid: mockChainEntity.uuid,
        ...input,
      });
      expect(result).toEqual(mockChainEntity);
    });
  });

  describe('getChainInfoByRpcs', () => {
    test('returns chainInfo and valid/invalid RPCs', async () => {
      const mockChainInfo = {
        chainId: mockChainEntity.chainId,
        runtimeVersion: `1.0.0`,
        chainDecimals: mockChainEntity.config.chainDecimals,
        chainTokens: mockChainEntity.config.chainTokens,
        metadataVersion: mockChainEntity.config.metadataVersion,
        events: mockChainEntity.events,
      };
      jest.spyOn(substrateService, 'createAPI').mockImplementation((rpc) =>
        Promise.resolve({
          isConnected: true,
        } as unknown as ApiPromise),
      );
      jest
        .spyOn(substrateService, 'getChainInfo')
        .mockResolvedValueOnce(mockChainInfo);

      const result = await service.getChainInfoByRpcs(
        mockChainEntity.config.rpcs,
      );

      expect(result.chainInfo).toEqual(mockChainInfo);
      expect(result.validRpcs).toEqual(mockChainEntity.config.rpcs);
      expect(result.invalidRpcs).toEqual([]);
    });

    test('throws error for invalid RPC', async () => {
      const mockCreateAPI = jest
        .spyOn(substrateService, 'createAPI')
        .mockImplementation((rpc) =>
          Promise.resolve({
            isConnected: false,
          } as unknown as ApiPromise),
        );

      await expect(
        service.getChainInfoByRpcs(mockChainEntity.config.rpcs),
      ).rejects.toThrow(
        `Invalid rpc: ${mockChainEntity.config.rpcs[0]}. Connection failed.`,
      );
      expect(mockCreateAPI).toHaveBeenCalledTimes(1);
    });
  });

  describe('insertChain', () => {
    it('should create new chain and return a summary', async () => {
      const mockSave = jest.spyOn(chainRepository, 'save');
      mockSave.mockResolvedValueOnce(mockChainEntity);

      const result = await service.insertChain(mockChainEntity);

      expect(result).toEqual(mockChainEntity);
    });
  });

  describe('createChain', () => {
    it('should create a chain successfully', async () => {
      const mockChainInfo = {
        chainId: mockChainEntity.chainId,
        runtimeVersion: `1.0.0`,
        chainDecimals: mockChainEntity.config.chainDecimals,
        chainTokens: mockChainEntity.config.chainTokens,
        metadataVersion: mockChainEntity.config.metadataVersion,
        events: mockChainEntity.events,
      };
      const mockGetChainInfoByRpcs = jest
        .spyOn(service, <any>'getChainInfoByRpcs')
        .mockResolvedValueOnce({
          chainInfo: mockChainInfo,
          validRpcs: mockChainEntity.config.rpcs,
          invalidRpcs: null,
        });
      const mockChainExistByChainId = jest
        .spyOn(service, 'chainExistByChainId')
        .mockResolvedValueOnce(false);
      const mockInsertChain = jest
        .spyOn(service, <any>'insertChain')
        .mockResolvedValueOnce(mockEventEntity);
      const mockCreateEvents = jest
        .spyOn(eventService, 'createEvents')
        .mockImplementationOnce(() => Promise.resolve());

      const mockInput = {
        name: mockChainEntity.name,
        imageUrl: mockChainEntity.imageUrl,
        rpcs: mockChainEntity.config.rpcs,
      };

      const result = await service.createChain(mockInput);
      expect(result).toEqual(mockEventEntity);
      expect(mockGetChainInfoByRpcs).toHaveBeenCalled();
      expect(mockChainExistByChainId).toHaveBeenCalled();
      expect(mockInsertChain).toHaveBeenCalled();
      expect(mockCreateEvents).toHaveBeenCalled();
    });

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
