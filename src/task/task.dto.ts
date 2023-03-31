import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';
import { EventRawData } from '../common/queue.type';
import { WorkflowSummary } from '../workflow/workflow.type';
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

export type ProcessTaskInput = {
  eventRawData: EventRawData;
  workflow: WorkflowSummary;
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
  status: TaskLog['status'];
  error: TaskLog['error'];
  output: TaskLog['output'];
}
