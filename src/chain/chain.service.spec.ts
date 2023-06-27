import { Test, TestingModule } from '@nestjs/testing';
import { ChainService } from './chain.service';
import { ChainEntity } from './chain.entity';
import { SubstrateService } from '../substrate/substrate.service';
import { EventService } from '../event/event.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEntity } from '../event/event.entity';
import { ApiPromise } from '@polkadot/api';
import * as defaultChains from './chains.json';
import { mockChainEntity, mockChainSummary } from '../../test/mock-data.util';

describe('ChainService', () => {
  let service: ChainService;
  let chainRepository: Repository<ChainEntity>;
  let substrateService: SubstrateService;
  let eventService: EventService;

  const mockedChainSummary = mockChainSummary();
  const mockedChainEntity: ChainEntity = mockChainEntity();
  const mockChainInfo = {
    chainId: mockedChainEntity.chainId,
    runtimeVersion: `1.0.0`,
    chainDecimals: mockedChainEntity.config.chainDecimals,
    chainTokens: mockedChainEntity.config.chainTokens,
    metadataVersion: mockedChainEntity.config.metadataVersion,
    events: mockedChainEntity.events,
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
        getRawMany: jest.fn().mockResolvedValueOnce([mockedChainEntity]),
      } as any);
      const result = await service.getChainsByEventIds(['test-event-id']);

      expect(result).toEqual([mockedChainEntity]);
    });
  });

  describe('getChainsSummary', () => {
    it('should return an array of ChainSummary', async () => {
      jest.spyOn(chainRepository, 'createQueryBuilder').mockReturnValue({
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValueOnce([mockedChainSummary]),
      } as any);
      const result = await service.getChainsSummary();
      expect(result).toEqual([mockedChainSummary]);
    });
  });

  describe('getChainSummary', () => {
    it('should return an item of ChainSummary', async () => {
      jest.spyOn(chainRepository, 'createQueryBuilder').mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValueOnce(mockedChainSummary),
      } as any);

      const chainUuid = 'some-uuid';
      const result = await service.getChainSummary(chainUuid);

      expect(result).toEqual(mockedChainSummary);
      expect(chainRepository.createQueryBuilder).toHaveBeenCalledTimes(1);
      expect(chainRepository.createQueryBuilder).toHaveBeenCalledWith();
      expect(chainRepository.createQueryBuilder().select).toHaveBeenCalledTimes(
        1,
      );
      expect(chainRepository.createQueryBuilder().select).toHaveBeenCalledWith([
        'uuid',
        'name',
        '"createdAt"',
        'version',
        '"imageUrl"',
        '"chainId"',
      ]);
      expect(chainRepository.createQueryBuilder().where).toHaveBeenCalledTimes(
        1,
      );
      expect(chainRepository.createQueryBuilder().where).toHaveBeenCalledWith({
        uuid: chainUuid,
      });
      expect(
        chainRepository.createQueryBuilder().getRawOne,
      ).toHaveBeenCalledTimes(1);
      expect(
        chainRepository.createQueryBuilder().getRawOne,
      ).toHaveBeenCalledWith();
    });
  });

  describe('onModuleInit', () => {
    it('should create default chains if chains are empty', async () => {
      const mockGetChainsSummary = jest
        .spyOn(service, 'getChainsSummary')
        .mockResolvedValue([]);
      const createChainSpy = jest
        .spyOn(service, 'createChain')
        .mockImplementation(() => Promise.resolve());

      await service.onModuleInit();

      expect(createChainSpy).toHaveBeenCalledTimes(defaultChains.length);
      expect(mockGetChainsSummary).toHaveBeenCalledTimes(1);
    });

    it('should not create default chains if chains are not empty', async () => {
      jest
        .spyOn(service, 'getChainsSummary')
        .mockResolvedValue([mockedChainSummary]);
      const createChainSpy = jest.spyOn(service, 'createChain');

      await service.onModuleInit();

      expect(createChainSpy).not.toHaveBeenCalled();
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
      mockSave.mockResolvedValueOnce(mockedChainEntity);

      await service.updateChain(mockedChainEntity.uuid, input);

      expect(mockSave).toHaveBeenCalledWith({
        uuid: mockedChainEntity.uuid,
        ...input,
      });
    });
  });

  describe('getChainInfoByRpcs', () => {
    test('returns chainInfo and valid/invalid RPCs', async () => {
      jest.spyOn(substrateService, 'createAPI').mockImplementation((rpc) =>
        Promise.resolve({
          isConnected: true,
        } as unknown as ApiPromise),
      );
      jest
        .spyOn(substrateService, 'getChainInfo')
        .mockResolvedValueOnce(mockChainInfo);

      const result = await service.getChainInfoByRpcs(
        mockedChainEntity.config.rpcs,
      );

      expect(result.chainInfo).toEqual(mockChainInfo);
      expect(result.validRpcs).toEqual(mockedChainEntity.config.rpcs);
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
        service.getChainInfoByRpcs(mockedChainEntity.config.rpcs),
      ).rejects.toThrow(
        `Invalid rpc: ${mockedChainEntity.config.rpcs[0]}. Connection failed.`,
      );
      expect(mockCreateAPI).toHaveBeenCalledTimes(1);
    });
  });

  describe('createChain', () => {
    it('should create a chain successfully', async () => {
      const mockGetChainInfoByRpcs = jest
        .spyOn(service, <any>'getChainInfoByRpcs')
        .mockResolvedValueOnce({
          chainInfo: mockChainInfo,
          validRpcs: mockedChainEntity.config.rpcs,
          invalidRpcs: null,
        });
      const mockChainExistByChainId = jest
        .spyOn(service, 'chainExistByChainId')
        .mockResolvedValueOnce(false);
      const mockSave = jest
        .spyOn(chainRepository, 'save')
        .mockResolvedValueOnce(mockedChainEntity);
      const mockCreateEvents = jest
        .spyOn(eventService, 'createEvents')
        .mockImplementationOnce(() => Promise.resolve());

      const mockInput = {
        name: mockedChainEntity.name,
        imageUrl: mockedChainEntity.imageUrl,
        rpcs: mockedChainEntity.config.rpcs,
      };

      await service.createChain(mockInput);
      expect(mockGetChainInfoByRpcs).toHaveBeenCalled();
      expect(mockChainExistByChainId).toHaveBeenCalled();
      expect(mockSave).toHaveBeenCalled();
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
