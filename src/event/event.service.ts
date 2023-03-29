import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { set } from 'lodash';
import { Repository } from 'typeorm';
import { Pagination } from '../common/pagination.type';
import { EventData } from '../common/queue.type';
import { EventDef, GeneralTypeEnum } from '../substrate/substrate.data';
import { EventDataField } from './event.dto';
import { EventEntity } from './event.entity';

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(Event)
    private eventRepository: Repository<EventEntity>,
  ) {}

  async createEvents(events: EventDef[], chainUuid: string) {
    const createEventsInput: Partial<EventEntity>[] = events.map((event) => ({
      ...event,
      chainUuid,
    }));
    await this.eventRepository.insert(createEventsInput);
  }

  getEventsByChainUuidAndName(chainUuid: string, names: string[]) {
    return this.eventRepository
      .createQueryBuilder('event')
      .where('"chainUuid" = :chainUuid', { chainUuid })
      .andWhere(`CONCAT(pallet, '.', name) IN (:...names) `, { names })
      .getMany();
  }

  async getEventByChain(
    chainUuid: string,
    eventId: number,
  ): Promise<EventEntity> {
    const event = await this.eventRepository.findOneBy({
      id: eventId,
      chainUuid,
    });

    if (!event) {
      return null;
    }

    return event;
  }

  async generateEventDataSample(eventId): Promise<EventData> {
    const event = await this.getEventById(eventId);
    if (!event) {
      return null;
    }

    const eventData: EventData = {
      timestamp: Date.now(),
      block: {
        hash: '0xe80f966994c42e248e3de6d0102c09665e2b128cca66d71e470e1d2a9b7fbecf',
      },
      success: true,
      data: null,
    };
    event.fields.forEach((f) => set(eventData, f.name, f.example));

    return eventData;
  }

  async getEventById(eventId: number): Promise<EventEntity> {
    return await this.eventRepository.findOneBy({
      id: eventId,
    });
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
        '(event.name ILIKE :search OR event.pallet ILIKE :search OR event.description ILIKE :search)',
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

  getEventDataFields(event: EventEntity): EventDataField[] {
    const dataFields = event.schema.map((field) => {
      const name = isNaN(parseInt(field.name))
        ? `data.${field.name}`
        : `data[${field.name}]`;

      return {
        name,
        description: field.description,
        type: field.type as GeneralTypeEnum,
        data: field.example,
        supportFilter: true,
        supportCustomMessage: true,
      };
    });

    const blockFields = [
      {
        name: 'success',
        description: 'The status of the event',
        type: GeneralTypeEnum.BOOL,
        data: true,
        supportFilter: true,
        supportCustomMessage: true,
      },
      {
        name: 'block.hash',
        description: 'The hash of the block',
        type: GeneralTypeEnum.STRING,
        data: '0x34b6bd12125bb2bfd0be1351222bada58904c5f79cab268bb994aea1dae5a7b8',
        supportFilter: false,
        supportCustomMessage: true,
      },
    ];

    const eventFields = [
      {
        name: 'id',
        description: 'The Id of the event',
        type: GeneralTypeEnum.NUMBER,
        data: event.id,
        supportFilter: false,
        supportCustomMessage: true,
      },
      {
        name: 'name',
        description: 'The name of the event',
        type: GeneralTypeEnum.STRING,
        data: event.name,
        supportFilter: false,
        supportCustomMessage: true,
      },
      {
        name: 'description',
        description: 'The description of the event',
        type: GeneralTypeEnum.STRING,
        data: event.description,
        supportFilter: false,
        supportCustomMessage: true,
      },
      {
        name: 'time',
        description: 'The time that the event happened',
        type: GeneralTypeEnum.STRING,
        data: event.description,
        supportFilter: false,
        supportCustomMessage: true,
      },
    ];

    return [...eventFields, ...blockFields, ...dataFields].filter(
      (field) => field,
    );
  }
}
