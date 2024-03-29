import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isNil, set, upperFirst, words } from 'lodash';
import { Repository } from 'typeorm';
import { ulid } from 'ulid';
import { Pagination } from '../common/pagination.type';
import { EventRawData } from '../common/queue.type';
import { EventDef, GeneralTypeEnum } from '../substrate/substrate.type';
import { DataField } from './event.dto';
import { EventEntity } from './event.entity';
import { ChainEntity } from '../chain/chain.entity';
import { blake2AsHex } from '@polkadot/util-crypto';
import { Event } from './event.type';

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(EventEntity)
    private eventRepository: Repository<EventEntity>,
  ) {}

  async createEvents(events: EventDef[], chainUuid: string) {
    const createEventsInput: Partial<EventEntity>[] = events.map((event) => ({
      id: ulid(Date.now()),
      ...event,
      chainUuid,
    }));

    await this.eventRepository.insert(createEventsInput);
  }

  getEventsByChainIdAndName(chainId: string, names: string[]) {
    return this.eventRepository
      .createQueryBuilder('e')
      .innerJoin(ChainEntity, 'c', 'c.uuid = e."chainUuid"')
      .where('c."chainId" = :chainId', { chainId })
      .andWhere(`e.name IN (:...names) `, { names })
      .getMany();
  }

  generateEventRawDataSample(event: Event): EventRawData {
    const fields = this.getEventDataFields(event);

    const eventRawData: EventRawData = {
      timestamp: Date.now(),
      block: {
        hash: blake2AsHex(ulid()),
      },
      success: true,
      data: null,
    };
    fields.forEach((f) => set(eventRawData, f.name, f.data));

    return eventRawData;
  }

  async getEventById(eventId: string, chainUuid?: string): Promise<Event> {
    let queryBuilder = this.eventRepository
      .createQueryBuilder('e')
      .innerJoin(ChainEntity, 'c', 'c.uuid = e."chainUuid"')
      .where('e."id" = :eventId', { eventId })
      .select([
        'e.id AS id',
        'e.name AS name',
        'e.description AS description',
        'e.schema AS schema',
        `JSONB_BUILD_OBJECT('uuid', c.uuid, 'name', c.name, 'chainId', c."chainId", 'imageUrl', c."imageUrl") AS chain`,
      ]);

    if (!isNil(chainUuid)) {
      queryBuilder = queryBuilder.andWhere('e."chainUuid =:chainUuid"', {
        chainUuid,
      });
    }

    return (await queryBuilder.getRawOne()) as Event;
  }

  async getEventsByChain(
    chainUuid: string,
    queryParams?: Pagination,
  ): Promise<Event[]> {
    let queryBuilder = this.eventRepository
      .createQueryBuilder('event')
      .innerJoin(ChainEntity, 'c', 'c.uuid = event."chainUuid"')
      .where('event."chainUuid" = :chainUuid', { chainUuid })
      .select([
        'event.id AS id',
        'event.name AS name',
        'event.description AS description',
        'event.schema AS schema',
        `JSONB_BUILD_OBJECT('uuid', c.uuid, 'name', c.name, 'chainId', c."chainId", 'imageUrl', c."imageUrl") AS chain`,
      ]);

    if (queryParams.search) {
      queryBuilder = queryBuilder.andWhere(
        '(event.name ILIKE :search OR event.description ILIKE :search)',
        { search: `%${queryParams.search}%` },
      );
    }

    const order = queryParams?.order
      ? `event.${queryParams.order}`
      : 'event.name';
    const sort = queryParams?.sort || 'ASC';

    return (await queryBuilder
      .orderBy(order, sort, 'NULLS LAST')
      .getRawMany()) as unknown as Event[];
  }

  getEventDataFields(event: Event): DataField[] {
    return event.schema.map((field) => {
      let name = `data.${field.name}`;
      let display = upperFirst(words(field.name).join(' '));

      if (!isNaN(parseInt(field.name))) {
        name = `data[${field.name}]`;
        display = `Event argument ${field.name}`;
      }

      return {
        name,
        description: field.description || display,
        type: field.type as GeneralTypeEnum,
        data: field.example,
        display,
      };
    });
  }

  getEventStatusFields(): DataField[] {
    return [
      {
        name: 'success',
        description: 'The status of the event',
        type: GeneralTypeEnum.BOOL,
        data: true,
        display: 'Status',
      },
    ];
  }

  getEventExtraFields(): DataField[] {
    return [
      {
        name: 'block.hash',
        description: 'The hash of the block',
        type: GeneralTypeEnum.STRING,
        data: blake2AsHex(ulid()),
        display: 'Block Hash',
      },
    ];
  }

  getEventInfoFields(event: Event): DataField[] {
    return [
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
    ];
  }
}
