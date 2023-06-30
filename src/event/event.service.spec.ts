import { EventService } from './event.service';
import { EventEntity } from './event.entity';
import { ChainEntity } from '../chain/chain.entity';
import { Repository } from 'typeorm';
import { EventDef, GeneralTypeEnum } from '../substrate/substrate.type';
import { Event } from './event.type';
import { get } from 'lodash';
import { SortType } from '../common/pagination.type';

describe('EventService', () => {
  let eventService: EventService;
  let eventRepository: Repository<EventEntity>;
  const eventDefs: EventDef[] = [
    {
      name: 'event1',
      description: 'description1',
      schema: [],
      index: 1,
    },
    {
      name: 'event2',
      description: 'description2',
      schema: [],
      index: 2,
    },
  ];
  const event: Event = {
    id: '1234',
    name: 'eventName',
    description: 'eventDescription',
    schema: [
      {
        name: 'index',
        type: GeneralTypeEnum.NUMBER,
        example: 98000,
        typeName: 'T::AccountIndex',
        description: '',
        originalType: 'u32',
      },
      {
        name: 'who',
        type: GeneralTypeEnum.STRING,
        example: '2UbGKDKa9Atsx3BsbGZN9BtUC5xAi7PS2SQM',
        typeName: 'T::AccountId',
        description: '',
        originalType: 'AccountId32',
      },
    ],
    chain: {
      uuid: '01H2QCFESCHJAHDJV1BRFKE2PQ',
      name: '01H2S828695SQJ8PV131Y45RA7',
      createdAt: '2023-06-12T01:45:05.201Z',
      version: '9420',
      imageUrl:
        'https://01H2S82869WS23KJ6CF8PGKXRP.com/01H2S828691ZCXQAHVG9TAKMKC.png',
      chainId: 'kusama',
    },
  };

  beforeEach(() => {
    eventRepository = {
      create: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as any;
    eventService = new EventService(eventRepository);
  });

  describe('createEvents', () => {
    it('creates events in the repository', async () => {
      const chainUuid = 'chainUuid';
      await eventService.createEvents(eventDefs, chainUuid);

      expect(eventRepository.insert).toHaveBeenCalled();
    });
  });

  describe('getEventsByChainIdAndName', () => {
    it('gets events by chain id and names from the repository', async () => {
      const chainId = 'chainId';
      const names = ['event1'];
      jest.spyOn(eventRepository, 'createQueryBuilder').mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValueOnce([eventDefs[0]]),
      } as any);

      await eventService.getEventsByChainIdAndName(chainId, names);

      expect(eventRepository.createQueryBuilder).toHaveBeenCalledWith('e');
      expect(
        eventRepository.createQueryBuilder().innerJoin,
      ).toHaveBeenCalledWith(ChainEntity, 'c', 'c.uuid = e."chainUuid"');
      expect(eventRepository.createQueryBuilder().where).toHaveBeenCalledWith(
        'c."chainId" = :chainId',
        { chainId },
      );
      expect(
        eventRepository.createQueryBuilder().andWhere,
      ).toHaveBeenCalledWith(`e.name IN (:...names) `, { names });
      expect(eventRepository.createQueryBuilder().getMany).toHaveBeenCalled();
    });
  });

  describe('generateEventRawDataSample', () => {
    it('should correctly generate event raw data for a given event', () => {
      const eventDataFields = eventService.getEventDataFields(event);

      const eventRawData = eventService.generateEventRawDataSample(event);

      expect(eventRawData.timestamp).toBeGreaterThan(0);
      expect(eventRawData.block.hash).toBeTruthy();
      expect(eventRawData.success).toBe(true);
      expect(eventRawData.data).not.toBeNull();

      eventDataFields.forEach((field) => {
        expect(get(eventRawData, field.name)).toBe(field.data);
      });
    });
  });

  describe('getEventById', () => {
    beforeEach(() => {
      jest.spyOn(eventRepository, 'createQueryBuilder').mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValueOnce(eventDefs[0]),
      } as any);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should call createQueryBuilder with correct params', async () => {
      await eventService.getEventById('1');

      expect(eventRepository.createQueryBuilder).toHaveBeenCalledWith('e');
      expect(
        eventRepository.createQueryBuilder().innerJoin,
      ).toHaveBeenCalledWith(ChainEntity, 'c', 'c.uuid = e."chainUuid"');
      expect(eventRepository.createQueryBuilder().where).toHaveBeenCalledWith(
        'e."id" = :eventId',
        {
          eventId: '1',
        },
      );
      expect(eventRepository.createQueryBuilder().select).toHaveBeenCalledWith([
        'e.id AS id',
        'e.name AS name',
        'e.description AS description',
        'e.schema AS schema',
        `JSONB_BUILD_OBJECT('uuid', c.uuid, 'name', c.name, 'chainId', c."chainId", 'imageUrl', c."imageUrl") AS chain`,
      ]);
      expect(eventRepository.createQueryBuilder().getRawOne).toHaveBeenCalled();
    });

    it('should add chainUuid to the query if chainUuid is provided', async () => {
      await eventService.getEventById('1', 'chain-uuid');

      expect(
        eventRepository.createQueryBuilder().andWhere,
      ).toHaveBeenCalledWith('e."chainUuid =:chainUuid"', {
        chainUuid: 'chain-uuid',
      });
    });

    it('should return the correct event object', async () => {
      const result = await eventService.getEventById('1');

      expect(result).toEqual(eventDefs[0]);
    });
  });

  describe('getEventsByChain', () => {
    beforeEach(() => {
      jest.spyOn(eventRepository, 'createQueryBuilder').mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        search: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValueOnce([event]),
      } as any);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return an array of events with default params', async () => {
      const result = await eventService.getEventsByChain(event.chain.uuid, {
        limit: 1,
        offset: 0,
      });

      expect(eventRepository.createQueryBuilder).toHaveBeenCalledWith('event');
      expect(
        eventRepository.createQueryBuilder().innerJoin,
      ).toHaveBeenCalledWith(ChainEntity, 'c', 'c.uuid = event."chainUuid"');
      expect(eventRepository.createQueryBuilder().where).toHaveBeenCalledWith(
        'event."chainUuid" = :chainUuid',
        { chainUuid: event.chain.uuid },
      );
      expect(eventRepository.createQueryBuilder().select).toHaveBeenCalledWith([
        'event.id AS id',
        'event.name AS name',
        'event.description AS description',
        'event.schema AS schema',
        `JSONB_BUILD_OBJECT('uuid', c.uuid, 'name', c.name, 'chainId', c."chainId", 'imageUrl', c."imageUrl") AS chain`,
      ]);
      expect(
        eventRepository.createQueryBuilder().andWhere,
      ).not.toHaveBeenCalled();
      expect(eventRepository.createQueryBuilder().limit).not.toHaveBeenCalled();
      expect(
        eventRepository.createQueryBuilder().offset,
      ).not.toHaveBeenCalled();
      expect(eventRepository.createQueryBuilder().orderBy).toHaveBeenCalledWith(
        'event.name',
        'ASC',
        'NULLS LAST',
      );
      expect(
        eventRepository.createQueryBuilder().getRawMany,
      ).toHaveBeenCalled();

      expect(result).toEqual([event]);
    });

    it('should handle when order and sort are provided', async () => {
      const params = {
        limit: 1,
        offset: 0,
        sort: SortType.DESC,
        order: 'id',
      };
      await eventService.getEventsByChain(event.chain.uuid, params);

      expect(eventRepository.createQueryBuilder().orderBy).toHaveBeenCalledWith(
        `event.${params.order}`,
        params.sort,
        'NULLS LAST',
      );
    });

    it('should handle when search provided', async () => {
      const search = 'doo';
      await eventService.getEventsByChain(event.chain.uuid, {
        limit: 1,
        offset: 0,
        search,
      });

      expect(
        eventRepository.createQueryBuilder().andWhere,
      ).toHaveBeenCalledWith(
        '(event.name ILIKE :search OR event.description ILIKE :search)',
        { search: `%${search}%` },
      );
    });
  });

  describe('getEventDataFields', () => {
    it('should return an array of DataField objects', () => {
      const result = eventService.getEventDataFields(event);
      expect(result).toBeInstanceOf(Array);
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('description');
      expect(result[0]).toHaveProperty('type');
      expect(result[0]).toHaveProperty('data');
      expect(result[0]).toHaveProperty('display');
    });

    it('should correctly map the schema fields to DataField objects', () => {
      const result = eventService.getEventDataFields(event);
      expect(result).toEqual([
        {
          name: 'data.index',
          description: 'Index',
          type: GeneralTypeEnum.NUMBER,
          data: 98000,
          display: 'Index',
        },
        {
          name: 'data.who',
          description: 'Who',
          type: GeneralTypeEnum.STRING,
          data: '2UbGKDKa9Atsx3BsbGZN9BtUC5xAi7PS2SQM',
          display: 'Who',
        },
      ]);
    });

    it('should handle schema fields with numeric names', () => {
      const eventData = {
        ...event,
      };
      eventData.schema = [
        {
          name: '0',
          type: GeneralTypeEnum.STRING,
          example: 'fooandbar',
          typeName: 'T::AccountId',
          description: '',
          originalType: 'AccountId32',
        },
      ];
      const result = eventService.getEventDataFields(eventData);
      expect(result).toEqual([
        {
          name: 'data[0]',
          description: 'Event argument 0',
          type: GeneralTypeEnum.STRING,
          data: 'fooandbar',
          display: 'Event argument 0',
        },
      ]);
    });
  });

  describe('getEventStatusFields', () => {
    it('returns the correct data fields', () => {
      const expectedFields = [
        {
          name: 'success',
          description: 'The status of the event',
          type: GeneralTypeEnum.BOOL,
          data: true,
          display: 'Status',
        },
      ];

      expect(eventService.getEventStatusFields()).toEqual(expectedFields);
    });
  });

  describe('getEventExtraFields', () => {
    it('includes the correct values in the returned DataField object', () => {
      const result = eventService.getEventExtraFields()[0];
      expect(result.name).toBe('block.hash');
      expect(result.description).toBe('The hash of the block');
      expect(result.type).toBe(GeneralTypeEnum.STRING);
      expect(typeof result.data).toBe('string');
      expect(result.display).toBe('Block Hash');
    });

    it('generates a unique hash for each call to blake2AsHex', () => {
      const result1 = eventService.getEventExtraFields()[0];
      const result2 = eventService.getEventExtraFields()[0];
      expect(result1.data).not.toBe(result2.data);
    });
  });

  describe('getEventInfoFields', () => {
    it('should return an array of DataFields', () => {
      const fields = eventService.getEventInfoFields(event);
      expect(fields).toEqual([
        {
          name: 'id',
          description: 'The Id of the event',
          type: GeneralTypeEnum.NUMBER,
          data: event.id,
          display: 'Event ID',
        },
        {
          name: 'name',
          description: 'The name of the event',
          type: GeneralTypeEnum.STRING,
          data: event.name,
          display: 'Event Name',
        },
        {
          name: 'description',
          description: 'The description of the event',
          type: GeneralTypeEnum.STRING,
          data: event.description,
          display: 'Event Description',
        },
      ]);
    });
  });
});
