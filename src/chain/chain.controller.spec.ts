import { Test, TestingModule } from '@nestjs/testing';
import { ChainController } from './chain.controller';
import { ChainService } from './chain.service';
import { EventService } from '../event/event.service';
import { ChainSummary } from './chain.dto';
import { Event } from '../event/event.type';
import { DataField } from '../event/event.dto';
import { GeneralTypeEnum } from '../substrate/substrate.data';

describe('ChainController', () => {
  let chainSummary: ChainSummary;
  let event: Event;
  let controller: ChainController;
  let chainService: ChainService;
  let eventService: EventService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChainController],
      providers: [
        {
          provide: ChainService,
          useValue: {
            getChains: jest.fn(),
            chainExist: jest.fn(),
          },
        },
        {
          provide: EventService,
          useValue: {
            getEventsByChain: jest.fn(),
            getEventById: jest.fn(),
            getEventDataFields: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ChainController>(ChainController);
    chainService = module.get<ChainService>(ChainService);
    eventService = module.get<EventService>(EventService);

    chainSummary = {
      uuid: '01H2QCFESCHJAHDJV1BRFKE2PQ',
      name: '01H2S828695SQJ8PV131Y45RA7',
      createdAt: '2023-06-12T01:45:05.201Z',
      version: '9420',
      imageUrl:
        'https://01H2S82869WS23KJ6CF8PGKXRP.com/01H2S828691ZCXQAHVG9TAKMKC.png',
      chainId: 'kusama',
    };
    event = {
      id: '01H2QCFESN1HQD9C2WZ2G3XNCF',
      name: 'balances.Deposit',
      description: 'Some amount was deposited (e.g. for transaction fees).',
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
      chain: chainSummary,
    };
  });

  describe('getChains', () => {
    it('should return an array of ChainSummary objects', async () => {
      const result = [chainSummary];
      jest.spyOn(chainService, 'getChains').mockResolvedValue(result);

      expect(await controller.getChains()).toEqual(result);
    });
  });

  describe('getEvents', () => {
    it('should throw NotFoundException if chain does not exist', async () => {
      jest.spyOn(chainService, 'chainExist').mockResolvedValue(false);

      await expect(
        controller.getEvents(
          { uuid: 'invalid-uuid' },
          {
            limit: 0,
            offset: 0,
          },
        ),
      ).rejects.toThrow('Chain not found');
    });

    it('should return events mapped to id, name, and description', async () => {
      const events = [event];
      jest.spyOn(chainService, 'chainExist').mockResolvedValue(true);
      jest.spyOn(eventService, 'getEventsByChain').mockResolvedValue(events);

      const result = await controller.getEvents(
        { uuid: 'valid-uuid' },
        {
          limit: 10,
          offset: 0,
        },
      );

      expect(result).toEqual(
        events.map((event) => ({
          id: event.id,
          name: event.name,
          description: event.description,
        })),
      );
    });
  });

  describe('getEvent', () => {
    const uuid = '123';
    const eventId = '456';

    it('should return an event with its fields', async () => {
      const fields: DataField[] = [
        {
          name: 'data.who',
          description: 'Who',
          type: GeneralTypeEnum.STRING,
          data: '2UbGKDKa9Au5h3qYPsiKYFazNGWViMn38yBw',
          display: 'Who',
        },
        {
          name: 'data.amount',
          description: 'Amount',
          type: GeneralTypeEnum.NUMBER,
          data: 44000,
          display: 'Amount',
        },
      ];
      jest.spyOn(chainService, 'chainExist').mockResolvedValue(true);
      jest.spyOn(eventService, 'getEventById').mockResolvedValue(event);
      jest
        .spyOn(eventService, 'getEventDataFields')
        .mockReturnValueOnce(fields);

      const result = await controller.getEvent(uuid, eventId);

      expect(result).toEqual({
        id: event.id,
        name: event.name,
        description: event.description,
        chain: event.chain,
        fields,
      });
      expect(eventService.getEventDataFields).toHaveBeenCalledWith(event);
    });

    it('should throw not found exception when chain does not exist', async () => {
      jest.spyOn(chainService, 'chainExist').mockResolvedValue(false);

      await expect(controller.getEvent(uuid, eventId)).rejects.toThrowError(
        'Chain not found',
      );
    });

    it('should throw not found exception when event does not exist', async () => {
      jest.spyOn(chainService, 'chainExist').mockResolvedValue(true);
      jest.spyOn(eventService, 'getEventById').mockResolvedValue(undefined);

      await expect(controller.getEvent(uuid, eventId)).rejects.toThrowError(
        'Event not found',
      );
    });
  });
});
