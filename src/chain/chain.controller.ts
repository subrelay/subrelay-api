import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  InternalServerErrorException,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBasicAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { GetEventsQueryParams } from 'src/event/event.dto';
import { Event, EventDetail } from 'src/event/event.entity';
import { EventService } from 'src/event/event.service';
import { CreateChainRequest, UpdateChainRequest } from './chain.dto';
import { Chain } from './chain.entity';
import { ChainService } from './chain.service';

@ApiTags('Chain')
@Controller('chains')
export class ChainController {
  constructor(
    private readonly chainService: ChainService,
    private readonly eventService: EventService,
  ) {}

  @Get()
  @ApiOkResponse({
    description: 'Return data if request is successful',
    isArray: true,
    type: Chain,
  })
  @ApiOperation({
    summary: 'Get all supported chains',
    description: 'This is a public endpoint',
  })
  async getChains(): Promise<Chain[]> {
    return this.chainService.getChains();
  }

  @Post()
  @ApiBasicAuth('admin')
  @ApiCreatedResponse({
    description: 'Return chain data if request is successful',
    type: Chain,
  })
  @ApiOperation({
    summary: 'Create a new chain',
    description: 'Only admin can access this endpoint',
  })
  async createChain(@Body() input: CreateChainRequest): Promise<Chain> {
    const taskResult = await this.chainService.createChain(input);
    if (taskResult.success) {
      return taskResult.output;
    } else {
      throw new InternalServerErrorException(taskResult.error.message);
    }
  }

  @Delete(':chainId')
  @ApiBasicAuth('admin')
  @HttpCode(204)
  async deleteChain(@Param() pathParams: { chainId?: string }) {
    await this.chainService.deleteChainByChainId(pathParams.chainId);
  }

  @Put(':uuid')
  @HttpCode(204)
  @ApiBasicAuth('admin')
  @ApiNoContentResponse({
    description: 'Return chain data if request is successful',
  })
  @ApiOperation({
    summary: 'Update name and image of a chain',
    description: 'Only admin can access this endpoint',
  })
  async updateChain(
    @Param() pathParams: { uuid?: string },
    @Body() input: UpdateChainRequest,
  ) {
    if (!(await this.chainService.chainExist(pathParams.uuid))) {
      throw new NotFoundException('Chain not found');
    }

    await this.chainService.updateChain(pathParams.uuid, input);
  }

  @Get(':uuid/events')
  @ApiOkResponse({
    description: 'Return data if request is successful',
    isArray: true,
    type: Event,
  })
  @ApiOperation({
    summary: 'Get all events of a chain',
    description: 'This is a public endpoint',
  })
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
  @ApiOkResponse({
    description: 'Return data if request is successful',
    type: EventDetail,
  })
  @ApiOperation({
    summary: 'Get an event details',
    description: 'This is a public endpoint',
  })
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
