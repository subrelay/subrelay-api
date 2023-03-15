import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, ValidateNested } from 'class-validator';
import { EventData } from '../common/queue.type';
import { EventDetail } from '../event/event.dto';
import { WorkflowSummary } from '../workflow/workflow.dto';
import { Task } from './entity/task.entity';
import { ProcessStatus, TaskOutput, TaskType } from './type/task.type';

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
  event: EventDetail;
  eventData: EventData;
  workflow: Pick<WorkflowSummary, 'id' | 'name'>;
};

export class TaskLogDetail {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '2022-11-18T00:53:30.082Z' })
  startedAt?: Date;

  @ApiProperty({ example: '2022-11-19T00:53:30.082Z' })
  finishedAt?: Date;

  @ApiProperty({ example: ProcessStatus.SUCCESS, enum: ProcessStatus })
  status: ProcessStatus;

  @ApiProperty({ type: Task })
  task: Task;

  @ApiProperty({ type: TaskOutput })
  output: TaskOutput;

  @ApiProperty({ type: EventData })
  input?: EventData;
}
