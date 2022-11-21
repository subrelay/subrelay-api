import { Body, Controller, Post } from '@nestjs/common';
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
}
