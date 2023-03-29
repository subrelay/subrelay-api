import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, ValidateNested } from 'class-validator';
import { pick } from 'lodash';
import { EventData } from '../common/queue.type';
import { EventDetail } from '../event/event.dto';
import { Event } from '../event/event.entity';
import { WorkflowEntity } from '../workflow/entity/workflow.entity';
import { WorkflowSummary } from '../workflow/workflow.dto';
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
  eventInfo: EventDetail;
  eventData: EventData;
  workflow: Pick<WorkflowSummary, 'id' | 'name'>;
};

export class CustomMessageInput {
  @ApiProperty({ example: 1 })
  eventId: Event['id'];
  @ApiProperty({ example: 'balances.Transfer' })
  fullName: string;
  @ApiProperty({ example: 'This is Transfer event' })
  description: Event['description'];
  @ApiProperty({ example: '2023-03-19T03:59:46.281Z' })
  time: Date;
  @ApiProperty({
    example: {
      from: '13UVJyLnbVp8c4FQeiGVUSe11WLtR4mvxfhcuUHdVuW2V5gC',
      to: '13H6oLtji5L4ByvePgh7c7iAy1wpBRcFsxJkdxwn4TbaeaGA',
      amount: '0.0450',
    },
  })
  data: EventData['data'];
  @ApiProperty({ example: true })
  success: EventData['success'];
  @ApiProperty({
    example: {
      hash: '0x34b6bd12125bb2bfd0be1351222bada58904c5f79cab268bb994aea1dae5a7b8',
    },
  })
  block: EventData['block'];
  @ApiProperty({
    example: {
      id: 7,
      name: 'Dot',
    },
  })
  workflow?: {
    id: WorkflowEntity['id'];
    name: WorkflowEntity['name'];
  };

  constructor({ workflow, eventData, eventInfo }: ProcessTaskInput) {
    this.workflow = pick(workflow, ['id', 'name']);

    this.block = eventData.block;
    this.eventId = eventInfo.id;
    this.fullName = `${eventInfo.pallet}.${eventInfo.name}`;
    this.description = eventInfo.description;
    this.time = new Date(eventData.timestamp);
    this.data = eventData.data;
    this.success = eventData.success;
  }
}

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

  @ApiProperty({ type: EventData })
  input?: EventData;
}

export class ProcessTaskResponse {
  success: TaskLog['success'];
  error: TaskLog['error'];
  output: TaskLog['output'];
}
