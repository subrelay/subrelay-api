import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
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
import { Pagination } from '../common/pagination.type';
import { GetEventsResponse, GetOneEventResponse } from '../event/event.dto';
import { EventService } from '../event/event.service';
import { CustomMessageInput } from '../task/task.dto';
import {
  ChainSummary,
  CreateChainRequest,
  UpdateChainRequest,
} from './chain.dto';
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
    type: ChainSummary,
  })
  @ApiOperation({
    summary: 'Get all supported chains',
    description: 'This is a public endpoint',
  })
  async getChains(): Promise<ChainSummary[]> {
    return this.chainService.getChains();
  }

  @Post()
  @ApiBasicAuth('admin')
  @ApiCreatedResponse({
    description: 'Return chain data if request is successful',
    type: ChainSummary,
  })
  @ApiOperation({
    summary: 'Create a new chain',
    description: 'Only admin can access this endpoint',
  })
  async createChain(@Body() input: CreateChainRequest): Promise<ChainSummary> {
    return await this.chainService.createChain(input);
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
  })
  @ApiOperation({
    summary: 'Get all events of a chain',
    description: 'This is a public endpoint',
  })
  async getEvents(
    @Param() pathParams: { uuid?: string },
    @Query() queryParams: Pagination,
  ): Promise<GetEventsResponse[]> {
    if (!(await this.chainService.chainExist(pathParams.uuid))) {
      throw new NotFoundException('Chain not found');
    }

    return this.eventService.getEventsByChain(pathParams.uuid, queryParams);
  }

  @Get(':uuid/events/:eventId')
  @ApiOkResponse({
    description: 'Return data if request is successful',
  })
  @ApiOperation({
    summary: 'Get an event details',
    description: 'This is a public endpoint',
  })
  async getEvent(
    @Param('uuid') uuid: string,
    @Param('eventId', ParseIntPipe) eventId: number,
  ): Promise<GetOneEventResponse> {
    if (!(await this.chainService.chainExist(uuid))) {
      throw new NotFoundException('Chain not found');
    }

    const event = await this.eventService.getEventByChain(uuid, eventId);
    const eventDataSample = await this.eventService.generateEventDataSample(
      eventId,
    );
    const eventSample = new CustomMessageInput({
      eventInfo: event,
      eventData: eventDataSample,
      workflow: {
        id: 1,
        name: 'Untitled',
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return {
      ...event,
      sample: eventSample,
    };
  }
}
