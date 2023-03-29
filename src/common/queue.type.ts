import { EventDetail } from '../event/event.dto';

export class EventRawData {
  name: string;
  data: any;
  block: {
    hash: string;
  };
}

export class BlockJobData {
  timestamp: number;
  hash: string;
  chainUuid: string;
  events: EventRawData[];
  success: boolean;
}

export class EventData {
  timestamp: number;
  success: boolean;
  block: {
    hash: string;
  };
  data: any;
}

export class WorkflowJobData {
  workflowVersionId: number;
  event: EventDetail;
  eventData: EventData;
}
