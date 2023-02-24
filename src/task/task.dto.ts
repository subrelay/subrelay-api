import { IsEnum, IsInt, IsNotEmpty, ValidateNested } from 'class-validator';
import { EventData } from '../common/queue.type';
import { Event } from '../event/event.entity';
import { WorkflowSummary } from '../workflow/workflow.dto';
import { TaskType } from './type/task.type';

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
  event: Event;
  eventData: EventData;
  workflow: Pick<WorkflowSummary, 'id' | 'name'>;
};
