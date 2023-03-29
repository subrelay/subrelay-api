import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, ValidateNested } from 'class-validator';
import { pick } from 'lodash';
import { EventRawData } from '../common/queue.type';
import { WorkflowEntity } from '../workflow/entity/workflow.entity';
import { TaskEntity } from './entity/task.entity';
import { TaskLog, TaskStatus, TaskType } from './type/task.type';

export class ProcessTaskRequestData {
  @IsInt()
  @IsNotEmpty()
  eventId: number;
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

export type ProcessTaskInput = {
  eventRawData: EventRawData;
  workflow: WorkflowEntity;
};

export class TaskLogDetail {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '2022-11-18T00:53:30.082Z' })
  startedAt?: Date;

  @ApiProperty({ example: '2022-11-19T00:53:30.082Z' })
  finishedAt?: Date;

  @ApiProperty({ example: TaskStatus.SUCCESS, enum: TaskStatus })
  status: TaskStatus;

  @ApiProperty({ type: TaskEntity })
  task: TaskEntity;

  @ApiProperty({ example: { success: true } })
  output: any;

  @ApiProperty()
  input?: any;
}

export class ProcessTaskResponse {
  success: TaskLog['success'];
  error: TaskLog['error'];
  output: TaskLog['output'];
}
