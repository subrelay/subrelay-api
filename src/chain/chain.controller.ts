import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { map, omit, pick } from 'lodash';
import { Pagination } from '../common/pagination.type';
import { GetOneEventResponse } from '../event/event.dto';
import { EventService } from '../event/event.service';
import { ChainSummary } from './chain.dto';
import { ChainService } from './chain.service';

@Controller('chains')
export class ChainController {
  constructor(
    private readonly chainService: ChainService,
    private readonly eventService: EventService,
  ) {}

  @Get()
  async getChains(): Promise<ChainSummary[]> {
    return this.chainService.getChainsSummary();
  }

  @Get(':uuid/events')
  async getEvents(
    @Param() pathParams: { uuid?: string },
    @Query() queryParams: Pagination,
  ) {
    if (!(await this.chainService.chainExist(pathParams.uuid))) {
      throw new NotFoundException('Chain not found');
    }

    const events = await this.eventService.getEventsByChain(
      pathParams.uuid,
      queryParams,
    );

    return map(events, (event) => pick(event, ['id', 'name', 'description']));
  }

  @Get(':uuid/events/:eventId')
  async getEvent(
    @Param('uuid') uuid: string,
    @Param('eventId') eventId: string,
  ): Promise<GetOneEventResponse> {
    if (!(await this.chainService.chainExist(uuid))) {
      throw new NotFoundException('Chain not found');
    }

    const event = await this.eventService.getEventById(eventId);

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return {
      ...omit(event, ['schema']),
      fields: this.eventService.getEventDataFields(event),
    };
  }
}
