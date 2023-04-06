import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { map, omit, pick } from 'lodash';
import { Pagination } from '../common/pagination.type';
import { GetOneEventResponse } from '../event/event.dto';
import { EventService } from '../event/event.service';
import {
  ChainSummary,
  CreateChainRequest,
  UpdateChainRequest,
} from './chain.dto';
import { ChainService } from './chain.service';

@Controller('chains')
export class ChainController {
  constructor(
    private readonly chainService: ChainService,
    private readonly eventService: EventService,
  ) {}

  @Get()
  async getChains(): Promise<ChainSummary[]> {
    return this.chainService.getChains();
  }

  @Post()
  async createChain(@Body() input: CreateChainRequest): Promise<ChainSummary> {
    return await this.chainService.createChain(input);
  }

  @Delete(':uuid')
  @HttpCode(204)
  async deleteChain(@Param() pathParams: { uuid?: string }) {
    if (!(await this.chainService.chainExist(pathParams.uuid))) {
      throw new NotFoundException('Chain not found');
    }

    await this.chainService.deleteChainByChainId(pathParams.uuid);
  }

  @Put(':uuid')
  @HttpCode(200)
  async updateChain(
    @Param() pathParams: { uuid?: string },
    @Body() input: UpdateChainRequest,
  ) {
    if (!(await this.chainService.chainExist(pathParams.uuid))) {
      throw new NotFoundException('Chain not found');
    }

    return this.chainService.updateChain(pathParams.uuid, input);
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

    const fields = this.eventService.getEventDataFields(event);

    return {
      ...omit(event, ['schema']),
      fields,
    };
  }
}
