import { IsEnum, ValidateNested } from 'class-validator';
import { EventData } from 'src/common/queue.type';
import { Event } from 'src/event/event.entity';
import { Task } from './entity/task.entity';
import { AbsConfig, TaskOutput, TaskType } from './type/task.type';
import { IsTaskConfig } from './validator/task-config.validator';

export class ProcessTaskRequest {
  data: any;

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

export type TaskInput = Pick<Task, 'type' | 'config' | 'dependOn'>;

export class ProcessTaskData {
  eventData?: EventData;
  event?: Event;
  input?: TaskOutput; // prev task output
}
