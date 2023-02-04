import { Body, Controller, Get, NotFoundException, Post } from '@nestjs/common';
import { mapValues, startCase } from 'lodash';
import { EventService } from 'src/event/event.service';
import { ProcessTaskRequest } from './task.dto';
import { TaskService } from './task.service';
import { TaskOutput } from './type/task.type';

@Controller('tasks')
export class TaskController {
  constructor(
    private readonly taskService: TaskService,
    private readonly eventService: EventService,
  ) {}

  @Post('/run')
  async processTask(@Body() input: ProcessTaskRequest): Promise<TaskOutput> {
    let data;
    const event = await this.eventService.getEventById(input.data.eventId);
    if (input.data.eventId) {
      const eventSample = await this.eventService.generateEventSample(
        input.data.eventId,
      );
      if (!eventSample) {
        throw new NotFoundException('Event not found');
      }

      data = eventSample;
    }

    console.log(data);

    return this.taskService.processTask(
      {
        config: input.config,
        type: input.type,
      },
      {
        eventData: data,
        event,
      },
    );
  }

  @Get('/operators')
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
