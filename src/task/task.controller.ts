import { Body, Controller, Get, Post } from '@nestjs/common';
import { mapValues, startCase } from 'lodash';
import { ProcessTaskRequest } from './task.dto';
import { TaskService } from './task.service';
import { TaskOutput } from './type/task.type';

@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post('/run')
  async processTask(@Body() input: ProcessTaskRequest): Promise<TaskOutput> {
    return this.taskService.processTask({
      data: input.data,
      task: {
        id: 1, // hardcode
        name: '1',
        config: input.config,
        type: input.type,
      },
    });
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
