import { IsEnum, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { TaskEntity } from './entity/task.entity';
import { TaskLog, TaskStatus, TaskType } from './type/task.type';

export class ProcessTaskRequestData {
  @IsString()
  @IsNotEmpty()
  eventId: string;
}

export class ProcessTaskRequest {
  @ValidateNested()
  data: ProcessTaskRequestData;

  @ValidateNested()
  config: any;

  @IsEnum(TaskType, {
    message: `Invalid status. Possible values: ${Object.values(TaskType).join(
      ', ',
    )}`,
  })
  type: TaskType;
}

export class TaskLogDetail {
  id: number;

  startedAt?: Date;

  finishedAt?: Date;

  status: TaskStatus;

  task: TaskEntity;

  output: any;

  input?: any;
}

export class ProcessTaskResponse {
  status: TaskLog['status'];
  error: TaskLog['error'];
  output: TaskLog['output'];
}
