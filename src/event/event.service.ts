import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { set } from 'lodash';
import { Repository } from 'typeorm';
import { Pagination } from '../common/pagination.type';
import { EventRawData } from '../common/queue.type';
import { EventDef, GeneralTypeEnum } from '../substrate/substrate.data';
import { EventDataField } from './event.dto';
import { EventEntity } from './event.entity';
import { EventData } from './event.type';

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

  getEventsByChainIdAndName(chainId: string, names: string[]) {
    return this.eventRepository
      .createQueryBuilder('event')
      .where('"chainId" = :chainUuid', { chainId })
      .andWhere(`name IN (:...names) `, { names })
      .getMany();
  }

  getEventData(event: EventEntity, eventRawData: EventRawData): EventData {
    return {
      id: event.id,
      name: event.name,
      description: event.description,
      success: eventRawData.success,
      time: new Date(eventRawData.timestamp),
      block: eventRawData.block,
      data: eventRawData.data,
    };
  }

  async generateEventRawDataSample(event: EventEntity): Promise<EventRawData> {
    const fields = await this.getEventDataFields(event);

    const eventRawData: EventRawData = {
      timestamp: Date.now(),
      block: {
        hash: '0xe80f966994c42e248e3de6d0102c09665e2b128cca66d71e470e1d2a9b7fbecf',
      },
      success: true,
      data: null,
    };
    fields.forEach((f) => set(eventRawData, f.name, f.data));

    return eventRawData;
  }

  async getEventById(eventId: string): Promise<EventEntity> {
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
      {
        name: 'time',
        description: 'The time that the event happened',
        type: GeneralTypeEnum.STRING,
        data: event.description,
        supportFilter: false,
        supportCustomMessage: true,
      },
    ];

    const eventInfoFields = [
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
    ];

    return [...eventInfoFields, ...blockFields, ...dataFields].filter(
      (field) => field,
    );
  }
}
