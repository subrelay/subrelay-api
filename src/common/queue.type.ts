import { EventDetail } from '../event/event.dto';

export class EventRawData {
  pallet: string;
  name: string;
  data: any;
  hash: string;
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
