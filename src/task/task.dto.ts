import { IsEnum, ValidateNested } from 'class-validator';
import { Task } from './task.entity';
import { AbsConfig, TaskType } from './type/task.type';
import { IsTaskConfig } from './validator/task-config.validator';

export class ProcessTaskRequest {
  data: any; // TODO it shoul be event data

  @ValidateNested()
  @IsTaskConfig()
  config: AbsConfig;

  @IsEnum(TaskType)
  type: TaskType;
}

export class ProcessTaskInput {
  task: Task;
  data: any; // TODO it shoul be workflow
}
