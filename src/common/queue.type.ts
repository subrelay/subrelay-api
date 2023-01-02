import { Event } from 'src/event/event.entity';

export class EventRawData {
  pallet: string;
  name: string;
  data: any;
  hash: string;
}

export class BlockJobData {
  timestamp: number;
  hash: string;
  chainUuid: string;
  events: EventRawData[];
  success: boolean;
}

export class EventData extends EventRawData {
  timestamp: number;
  success: boolean;
  hash: string;
  chainUuid: string;
}

export class WorkflowJobData {
  workflowVersionId: number;
  event: Event;
  eventData: EventData;
}
