import { WorkflowEntity } from '../workflow/entity/workflow.entity';

export class BlockJobData {
  timestamp: number;
  hash: string;
  chainId: string;
  events: {
    name: string;
    data: any;
  }[];
  success: boolean;
}

export class EventRawData {
  timestamp: number;
  success: boolean;
  block: {
    hash: string;
  };
  data: any;
}

export class WorkflowJobData {
  workflow: WorkflowEntity;
  eventRawData: EventRawData;
}
