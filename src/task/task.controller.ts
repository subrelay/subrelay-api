import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Post,
  Query,
} from '@nestjs/common';
import { mapValues, pick, startCase, upperFirst } from 'lodash';
import { EventService } from '../event/event.service';
import { ProcessTaskRequest, ProcessTaskResponse } from './task.dto';
import { TaskService } from './task.service';
import { BaseTask, ProcessTaskInput, TaskType } from './type/task.type';
import { DataField } from '../event/event.dto';
import { ulid } from 'ulid';
import { UserEntity } from '../user/user.entity';
import { UserInfo } from '../common/user-info.decorator';
import { UserService } from '../user/user.service';
import { UserSummary } from '../user/user.dto';
import { Event } from '../event/event.type';

@Controller('tasks')
export class TaskController {
  constructor(
    private readonly taskService: TaskService,
    private readonly eventService: EventService,
    private readonly userService: UserService,
  ) {}

  @Post('/run')
  @HttpCode(200)
  async processTask(
    @Body() input: ProcessTaskRequest,
    @UserInfo() user: UserSummary,
  ): Promise<ProcessTaskResponse> {
    const event = await this.eventService.getEventById(input.data.eventId);
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (input.type === TaskType.WEBHOOK) {
      input.config = { ...input.config, encrypted: false };
    }

    const baseTask = new BaseTask({
      type: input.type,
      config: input.config,
      id: 'TestTask',
    });

    const result = await this.taskService.processTask(
      baseTask,
      this.createProcessTaskInput(
        await this.userService.getUserById(user.id),
        event,
      ),
    );

    return {
      status: result.status,
      error: result.error,
      output: result.output,
    };
  }

  @Get('/filter/operators')
  async getFilterVariableOperators() {
    const mapping = this.taskService.getOperatorMapping();
    return mapValues(mapping, (operatorList) =>
      operatorList.map((operator) => ({
        value: operator,
        name: startCase(operator).toLowerCase(),
      })),
    );
  }

  @Get('/filter/fields')
  async getFilterVariableFields(
    @Query('eventId') eventId: string,
  ): Promise<DataField[]> {
    const event = await this.eventService.getEventById(eventId);

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return this.taskService.getFilterFields(event);
  }

  @Get('/custom-message/fields')
  async getCustomMessageFields(
    @Query('eventId') eventId: string,
  ): Promise<DataField[]> {
    const event = await this.eventService.getEventById(eventId);

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return this.taskService.getCustomMessageFields(event);
  }

  createProcessTaskInput(user: UserEntity, event: Event): ProcessTaskInput {
    const eventRawData = this.eventService.generateEventRawDataSample(event);

    return {
      event: {
        ...pick(event, ['id', 'name']),
        ...eventRawData,
        time: new Date(),
        description: upperFirst(event.description),
      },
      workflow: {
        id: ulid(),
        name: 'This is a sample workflow for testing task',
      },
      chain: {
        name: event.chain.name,
        uuid: event.chain.uuid,
      },
      user,
    };
  }
}
