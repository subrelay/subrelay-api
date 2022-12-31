import { Workflow } from 'src/workflow/entity/workflow.entity';

export class EventRawData {
  pallet: String;
  name: String;
  data: any;
  hash: String;
}

export class BlockJobData {
  timestamp: number;
  hash: String;
  chainUuid: String;
  events: EventRawData[];
  success: boolean;
}

export class EventData extends EventRawData {
  timestamp: number;
  success: boolean;
  hash: String;
  chainUuid: String;
}

export class WorkflowJobData {
  workflowVersionId: number;
  event: Event;
  eventData: EventData;
}
