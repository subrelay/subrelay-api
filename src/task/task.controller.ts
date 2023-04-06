import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { mapValues, startCase } from 'lodash';
import { EventService } from '../event/event.service';
import { ProcessTaskRequest, ProcessTaskResponse } from './task.dto';
import { TaskService } from './task.service';
import { BaseTask } from './type/task.type';

@Controller('tasks')
export class TaskController {
  constructor(
    private readonly taskService: TaskService,
    private readonly eventService: EventService,
  ) {}

  @Post('/run')
  @HttpCode(200)
  async processTask(
    @Body() input: ProcessTaskRequest,
  ): Promise<ProcessTaskResponse> {
    const event = await this.eventService.getEventById(input.data.eventId);
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const eventRawData = await this.eventService.generateEventRawDataSample(
      event,
    );

    const baseTask = new BaseTask({
      type: input.type,
      config: input.config,
      id: 'TestTask',
    });

    const result = await this.taskService.processTask(baseTask, {
      eventRawData,
      workflow: {
        id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
        name: 'This workflow only for testing',
        event,
      },
    });

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
}
