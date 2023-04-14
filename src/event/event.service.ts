import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isNil, set, words } from 'lodash';
import { Repository } from 'typeorm';
import { ulid } from 'ulid';
import { Pagination } from '../common/pagination.type';
import { EventRawData } from '../common/queue.type';
import { EventDef, GeneralTypeEnum } from '../substrate/substrate.data';
import { DataField } from './event.dto';
import { EventEntity } from './event.entity';
import { ChainEntity } from '../chain/chain.entity';
import { blake2AsHex } from '@polkadot/util-crypto';

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(EventEntity)
    private eventRepository: Repository<EventEntity>,
  ) {}

  async createEvents(events: EventDef[], chainUuid: string) {
    const createEventsInput: Partial<EventEntity>[] = events.map((event) => ({
      id: ulid(),
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

  generateEventRawDataSample(event: EventEntity): EventRawData {
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

  async getEventById(
    eventId: string,
    chainUuid?: string,
  ): Promise<EventEntity> {
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

    return (await queryBuilder.getRawOne()) as EventEntity;
  }

  getEventsByChain(
    chainUuid: string,
    queryParams?: Pagination,
  ): Promise<EventEntity[]> {
    let queryBuilder = this.eventRepository
      .createQueryBuilder('event')
      .where('event."chainUuid" = :chainUuid', { chainUuid });

    if (queryParams.search) {
      queryBuilder = queryBuilder.andWhere(
        '(event.name ILIKE :search OR event.description ILIKE :search)',
        { search: `%${queryParams.search}%` },
      );
    }

    const order = queryParams?.order || 'name';
    const sort = queryParams?.sort || 'ASC';

    if (queryParams.order && queryParams.offset) {
      queryBuilder = queryBuilder
        .limit(queryParams.limit)
        .offset(queryParams.offset);
    }
    return queryBuilder.orderBy(order, sort, 'NULLS LAST').getMany();
  }

  getEventDataFields(event: EventEntity): DataField[] {
    return event.schema.map((field) => {
      const name = isNaN(parseInt(field.name))
        ? `data.${field.name}`
        : `data[${field.name}]`;

      return {
        name,
        description: field.description || words(field.name).join(' '),
        type: field.type as GeneralTypeEnum,
        data: field.example,
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
      },
      {
        name: 'time',
        description: 'The time that the event happened',
        type: GeneralTypeEnum.STRING,
        data: new Date(Date.now()),
      },
    ];
  }

  getEventInfoFields(event: EventEntity): DataField[] {
    return [
      {
        name: 'id',
        description: 'The Id of the event',
        type: GeneralTypeEnum.NUMBER,
        data: event.id,
      },
      {
        name: 'name',
        description: 'The name of the event',
        type: GeneralTypeEnum.STRING,
        data: event.name,
      },
      {
        name: 'description',
        description: 'The description of the event',
        type: GeneralTypeEnum.STRING,
        data: event.description,
      },
    ];
  }
}
