import { Body, Controller, Get, NotFoundException, Post } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { mapValues, startCase } from 'lodash';
import { EventService } from '../event/event.service';
import { ProcessTaskRequest } from './task.dto';
import { TaskService } from './task.service';
import { BaseTask, TaskOutput } from './type/task.type';

@Controller('tasks')
@ApiTags('Task')
export class TaskController {
  constructor(
    private readonly taskService: TaskService,
    private readonly eventService: EventService,
  ) {}

  @Post('/run')
  @ApiOkResponse({
    description: 'Return data if request is successful',
    type: TaskOutput,
  })
  @ApiOperation({
    summary: 'Run a task',
  })
  @ApiBody({
    schema: {
      example: {
        type: 'trigger',
        data: {
          eventId: 3457,
        },
        config: {
          conditions: [
            [
              {
                variable: 'data.amount',
                operator: 'greaterThan',
                value: 10,
              },
            ],
          ],
        },
      },
    },
  })
  async processTask(@Body() input: ProcessTaskRequest): Promise<TaskOutput> {
    const eventInfo = await this.eventService.getEventById(input.data.eventId);
    if (!eventInfo) {
      throw new NotFoundException('Event not found');
    }

    const eventData = await this.eventService.generateEventSample(
      input.data.eventId,
    );

    const baseTask = new BaseTask({
      type: input.type,
      config: input.config,
      id: 0,
    });
    const result = await this.taskService.processTask(baseTask, {
      eventData,
      eventInfo,
      workflow: {
        id: 0,
        name: 'This workflow only for testing',
      },
    });

    return result.output;
  }

  @Get('/operators')
  @ApiOkResponse({
    description: 'Return data if request is successful',
    schema: {
      example: {
        boolean: [
          {
            value: 'isTrue',
            name: 'is true',
          },
        ],
        string: [
          {
            value: 'contains',
            name: 'contains',
          },
        ],
        number: [
          {
            value: 'equal',
            name: 'equal',
          },
        ],
      },
    },
  })
  @ApiOperation({
    summary: 'Return supported operators for condition filter',
  })
  async getTriggerOperators() {
    const mapping = this.taskService.getOperatorMapping();
    return mapValues(mapping, (operatorList) =>
      operatorList.map((operator) => ({
        value: operator,
        name: startCase(operator).toLowerCase(),
      })),
    );
  }
}
