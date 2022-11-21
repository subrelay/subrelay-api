import { Type } from 'class-transformer';
import { IsEnum, IsNotEmptyObject, ValidateNested } from 'class-validator';
import { Task } from './task.entity';
import { NotificationTaskConfig } from './type/notification.type';
import { getConfigType, TaskConfig, TaskType } from './type/task.type';
import { TriggerTaskConfig } from './type/trigger.type';

export class ProcessTaskRequest {
  data: any; // TODO it shoul be event data

  @ValidateNested()
  @Type((o) => getConfigType(o.object['type']))
  config: TaskConfig;

  @IsEnum(TaskType)
  type: TaskType;
}

export class ProcessTaskInput {
  task: Task;
  data: any; // TODO it shoul be workflow
}
