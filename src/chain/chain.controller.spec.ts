import { Test, TestingModule } from '@nestjs/testing';
import { ChainController } from './chain.controller';
import { ChainService } from './chain.service';
import { EventService } from '../event/event.service';
import {
  ChainSummary,
  CreateChainRequest,
  UpdateChainRequest,
} from './chain.dto';
import { EventDetail, EventSummary } from '../event/event.dto';
import { TaskOutput } from '../task/type/task.type';
import { NotFoundException } from '@nestjs/common';
import { SortType } from '../common/pagination.type';
import { GeneralTypeEnum } from '../substrate/substrate.data';

describe('ChainController', () => {
  let controller: ChainController;
  let chainService: ChainService;
  let eventService: EventService;
  const chainSummaries = {
    polkadot: {
      uuid: '97aef31e-2ddb-46d7-be8f-ff5f4ba8aa1e',
      name: 'Polkadot',
      createdAt: '2023-02-04T13:34:52.224Z',
      version: '9340',
      imageUrl: 'https://example.com/polkadot.png',
      chainId: 'polkadot',
    },
    westend: {
      uuid: '445c0175-ec0d-4dcf-a25e-4b647e6a101e',
      name: 'Westend',
      createdAt: '2023-02-04T10:06:47.335Z',
      version: '9370',
      imageUrl: 'https://example.com/westend.png',
      chainId: 'westend',
    },
  };
  const eventSummaries = [
    {
      id: 1,
      name: 'Transfer',
      pallet: 'balances',
      description: 'Transfer succeeded.',
      index: 2,
      chainUuid: chainSummaries.polkadot.uuid,
    },
  ];
  const eventDetail = {
    id: 1,
    name: 'Transfer',
    pallet: 'balances',
    description: 'Transfer succeeded.',
    index: 2,
    chainUuid: chainSummaries.polkadot.uuid,
    fields: [
      {
        name: 'success',
        description: 'The status of the event',
        type: GeneralTypeEnum.BOOL,
        example: true,
      },
      {
        name: 'data.from',
        description: '',
        type: GeneralTypeEnum.STRING,
        example: '13SDfVdrBaUrnoV7tMfvrGrxxANr1iJNEcPCmqZzF9FCpX8c',
      },
      {
        name: 'data.to',
        description: '',
        type: GeneralTypeEnum.STRING,
        example: '13SDfVdrBaUrnoV7tMfvrGrxxANr1iJNEcPCmqZzF9FCpX8c',
      },
      {
        name: 'data.amount',
        description: '',
        type: GeneralTypeEnum.NUMBER,
        example: 100000000,
      },
    ],
  };
  const chainDetail = {
    ...chainSummaries.polkadot,
    events: eventSummaries,
    config: {
      rpcs: ['wss://rpc.polkadot.io'],
      metadataVersion: 14,
      chainTokens: ['DOT'],
      chainDecimals: [10],
    },
  };

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
      const expectedResult: ChainSummary[] = Object.values(chainSummaries);
      jest.spyOn(chainService, 'getChains').mockResolvedValue(expectedResult);

      const result = await controller.getChains();

      expect(result).toBe(expectedResult);
      expect(chainService.getChains).toHaveBeenCalled();
    });
  });

  describe('createChain', () => {
    it('should create a new chain and return status', async () => {
      const input: CreateChainRequest = {
        name: chainDetail.name,
        imageUrl: chainDetail.imageUrl,
        rpcs: chainDetail.config.rpcs,
      };
      const output: TaskOutput = { success: true, output: {} };
      jest.spyOn(chainService, 'createChain').mockResolvedValue(output);

      const result = await controller.createChain(input);

      expect(result).toBe(output);
      expect(chainService.createChain).toHaveBeenCalledWith(input);
    });
  });

  describe('updateChain', () => {
    const input: UpdateChainRequest = {
      imageUrl: 'https://example.com/polkadot.png',
      name: 'foo',
    };
    const pathParams = { uuid: chainSummaries.polkadot.uuid };

    it('should run successfully', async () => {
      jest.spyOn(chainService, 'chainExist').mockResolvedValue(true);
      jest.spyOn(chainService, 'updateChain').mockResolvedValue(null);

      await controller.updateChain(pathParams, input);

      expect(chainService.updateChain).toHaveBeenCalledWith(
        pathParams.uuid,
        input,
      );
    });

    it('should throw NotFoundException if chain does not exist', async () => {
      jest.spyOn(chainService, 'chainExist').mockResolvedValue(false);

      try {
        await controller.updateChain(pathParams, input);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(chainService.updateChain).not.toHaveBeenCalled();
      }
    });
  });

  describe('getEvents', () => {
    const pathParams = { uuid: chainSummaries.polkadot.uuid };
    const queryParams = {
      limit: 10,
      offset: 0,
      sort: SortType.ASC,
    };

    it('should return an array of events', async () => {
      const expectedResult: EventSummary[] = Object.values(eventSummaries);
      jest.spyOn(chainService, 'chainExist').mockResolvedValue(true);
      jest
        .spyOn(eventService, 'getEventsByChain')
        .mockResolvedValue(expectedResult);

      const result = await controller.getEvents(pathParams, queryParams);

      expect(result).toBe(expectedResult);
      expect(eventService.getEventsByChain).toHaveBeenCalled();
    });

    it('should throw NotFoundException if chain does not exist', async () => {
      jest.spyOn(chainService, 'chainExist').mockResolvedValue(false);

      try {
        await controller.getEvents(pathParams, queryParams);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(eventService.getEventsByChain).not.toHaveBeenCalled();
      }
    });
  });

  describe('getEvent', () => {
    const pathParams = {
      uuid: chainSummaries.polkadot.uuid,
      eventId: eventDetail.id,
    };

    it('should return an event', async () => {
      const expectedResult: EventDetail = eventDetail;
      jest.spyOn(chainService, 'chainExist').mockResolvedValue(true);
      jest
        .spyOn(eventService, 'getEventByChain')
        .mockResolvedValue(expectedResult);

      const result = await controller.getEvent(
        pathParams.uuid,
        pathParams.eventId,
      );

      expect(result).toBe(expectedResult);
      expect(eventService.getEventByChain).toHaveBeenCalled();
    });

    it('should throw NotFoundException if chain does not exist', async () => {
      jest.spyOn(chainService, 'chainExist').mockResolvedValue(false);

      try {
        await controller.getEvent(pathParams.uuid, pathParams.eventId);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(eventService.getEventByChain).not.toHaveBeenCalled();
      }
    });
  });
});
