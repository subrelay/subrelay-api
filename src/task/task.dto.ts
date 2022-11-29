import { IsEnum, ValidateNested } from 'class-validator';
import { Task } from './entity/task.entity';
import { AbsConfig, TaskType } from './type/task.type';
import { IsTaskConfig } from './validator/task-config.validator';

export class ProcessTaskRequest {
  data: any; // TODO it shoul be event data

  @ValidateNested()
  @IsTaskConfig()
  config: AbsConfig;

  @IsEnum(TaskType, {
    message: `Invalid status. Possible values: ${Object.values(TaskType).join(
      ', ',
    )}`,
  })
  type: TaskType;
}

type TaskInput = Pick<Task, 'type' | 'config' | 'dependOn'>;

export class ProcessTaskInput {
  task: TaskInput;
  data: any; // TODO it shoul be workflow
}
