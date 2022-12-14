import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isEmpty } from 'lodash';
import { EventDef, GeneralTypeEnum } from 'src/substrate/substrate.data';
import { SubstrateService } from 'src/substrate/substrate.service';
import { Repository } from 'typeorm';
import { GetEventsQueryParams } from './event.dto';
import { Event, EventDetail, SupportedFilterField } from './event.entity';

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,

    private readonly substrateService: SubstrateService,
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
    const dataFields = event.dataSchema.map((field, index) => {
      const name = `data.${isEmpty(field.name) ? index : field.name}`;
      // Hardcode
      if (field.typeName === 'T::AccountId') {
        return {
          name,
          description: 'Account address',
          type: GeneralTypeEnum.STRING,
        };
      }

      return {
        name,
        description: field.description,
        type: field.type as GeneralTypeEnum,
      };
    });

    const eventFields = [
      {
        name: 'success',
        description: 'The status of the event',
        type: GeneralTypeEnum.BOOL,
      },
    ];

    return [...eventFields, ...dataFields].filter((field) => field);
  }
}
