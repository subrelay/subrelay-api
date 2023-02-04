import {
  Body,
  Controller,
  Get,
  HttpCode,
  InternalServerErrorException,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { GetEventsQueryParams } from 'src/event/event.dto';
import { Event, EventDetail } from 'src/event/event.entity';
import { EventService } from 'src/event/event.service';
import { CreateChainRequest, UpdateChainRequest } from './chain.dto';
import { Chain } from './chain.entity';
import { ChainService } from './chain.service';

@Controller('chains')
export class ChainController {
  constructor(
    private readonly chainService: ChainService,
    private readonly eventService: EventService,
  ) {}

  @Get()
  async getChains(): Promise<Chain[]> {
    return this.chainService.getChains();
  }

  @Post()
  async createChain(@Body() input: CreateChainRequest): Promise<Chain> {
    const taskResult = await this.chainService.createChain(input);
    if (taskResult.success) {
      return taskResult.output;
    } else {
      throw new InternalServerErrorException(taskResult.error.message);
    }
  }

  @Post()
  @HttpCode(204)
  async patchChain(
    @Param() pathParams: { uuid?: string },
    @Body() input: UpdateChainRequest,
  ) {
    if (!(await this.chainService.chainExist(pathParams.uuid))) {
      throw new NotFoundException('Chain not found');
    }

    await this.chainService.updateChain(pathParams.uuid, input);
  }

  @Get(':uuid/events')
  async getEvents(
    @Param() pathParams: { uuid?: string },
    @Query() queryParams: GetEventsQueryParams,
  ): Promise<Event[]> {
    if (!(await this.chainService.chainExist(pathParams.uuid))) {
      throw new NotFoundException('Chain not found');
    }

    return this.eventService.getEventsByChain(pathParams.uuid, queryParams);
  }

  @Get(':uuid/events/:eventId')
  async getEvent(
    @Param('uuid') uuid: string,
    @Param('eventId', ParseIntPipe) eventId: number,
  ): Promise<EventDetail> {
    if (!(await this.chainService.chainExist(uuid))) {
      throw new NotFoundException('Chain not found');
    }

    const event = await this.eventService.getEventByChain(uuid, eventId);

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return event;
  }
}
