import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { set } from 'lodash';
import { Repository } from 'typeorm';
import { EventDef, GeneralTypeEnum } from '../substrate/substrate.data';
import { GetEventsQueryParams } from './event.dto';
import { Event, EventDetail, SupportedFilterField } from './event.entity';
import { EventData } from './event.type';

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
  ) {}

  async createEvents(events: EventDef[], chainUuid: string) {
    const createEventsInput: Partial<Event>[] = events.map((event) => ({
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
  ): Promise<EventDetail> {
    const event = await this.eventRepository.findOneBy({
      id: eventId,
      chainUuid,
    });

    if (!event) {
      return null;
    }

    return {
      ...event,
      fields: this.getSupportedFields(event),
    };
  }

  async generateEventSample(eventId): Promise<EventData> {
    const event = await this.getEventById(eventId);
    if (!event) {
      return null;
    }

    const eventData = {
      timestamp: Date.now(),
      block: {
        hash: '0xe80f966994c42e248e3de6d0102c09665e2b128cca66d71e470e1d2a9b7fbecf',
      }, // TODO need to function to random a hash
      chainUuid: event.chainUuid,
    };
    event.fields.forEach((f) => set(eventData, f.name, f.example));
    return eventData;
  }

  async getEventById(eventId: number): Promise<EventDetail> {
    const event = await this.eventRepository.findOneBy({
      id: eventId,
    });

    if (!event) {
      return null;
    }

    return {
      ...event,
      fields: this.getSupportedFields(event),
    };
  }

  getEventsByChain(
    chainUuid: string,
    queryParams?: GetEventsQueryParams,
  ): Promise<Event[]> {
    let queryBuilder = this.eventRepository
      .createQueryBuilder('event')
      .select([
        'event.id',
        'event.name',
        'event.pallet',
        'event.index',
        'event.description',
        'event."chainUuid"',
      ])
      .where('event."chainUuid" = :chainUuid', { chainUuid });

    if (queryParams.pallet) {
      queryBuilder = queryBuilder.andWhere('event.pallet = :pallet', {
        pallet: queryParams.pallet,
      });
    }

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

  private getSupportedFields(event: Event): SupportedFilterField[] {
    const dataFields = event.dataSchema.map((field) => {
      const name = `data.${field.name}`;

      return {
        name,
        description: field.description,
        type: field.type as GeneralTypeEnum,
        example: field.example,
      };
    });

    const eventFields = [
      {
        name: 'success',
        description: 'The status of the event',
        type: GeneralTypeEnum.BOOL,
        example: true,
      },
    ];

    return [...eventFields, ...dataFields].filter((field) => field);
  }
}
