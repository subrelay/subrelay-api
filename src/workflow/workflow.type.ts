import { ChainEntity } from '../chain/chain.entity';
import { EventRawData } from '../common/queue.type';
import { EventEntity } from '../event/event.entity';
import { WorkflowLogEntity } from './entity/workflow-log.entity';
import { WorkflowEntity } from './entity/workflow.entity';

export enum WorkflowStatus {
  RUNNING = 'running',
  PAUSING = 'pausing',
}

export type WorkflowSummary = Pick<WorkflowEntity, 'id' | 'name' | 'event'> & {
  chain?: Pick<ChainEntity, 'uuid' | 'name' | 'imageUrl'>;
};

export type Workflow = Pick<
  WorkflowEntity,
  'id' | 'name' | 'status' | 'createdAt' | 'updatedAt'
> & {
  chain: Pick<ChainEntity, 'uuid' | 'name' | 'imageUrl'>;
  event: Pick<EventEntity, 'id' | 'name'>;
};

export type WorkflowLogSummary = Pick<
  WorkflowLogEntity,
  'id' | 'status' | 'startedAt' | 'finishedAt' | 'input'
> & {
  chain: Pick<ChainEntity, 'uuid' | 'name' | 'imageUrl'>;
  workflow: Pick<WorkflowEntity, 'id' | 'name'>;
};

export class ProcessWorkflowInput {
  workflow: WorkflowSummary;
  eventRawData: EventRawData;
}
