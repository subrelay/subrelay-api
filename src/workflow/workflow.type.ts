import { pick } from 'lodash';
import { ChainEntity } from '../chain/chain.entity';
import { EventRawData } from '../common/queue.type';
import { EventEntity } from '../event/event.entity';
import { WorkflowLogEntity } from './entity/workflow-log.entity';
import { WorkflowEntity } from './entity/workflow.entity';
import { UserEntity } from '../user/user.entity';

export enum WorkflowStatus {
  RUNNING = 'running',
  PAUSING = 'pausing',
}

export type WorkflowSummary = Pick<WorkflowEntity, 'id' | 'name' | 'event'> & {
  chain?: Pick<ChainEntity, 'uuid' | 'name' | 'imageUrl'>;
};

export type Workflow = Pick<
  WorkflowEntity,
  'id' | 'name' | 'status' | 'createdAt' | 'updatedAt' | 'userId'
> & {
  chain: Pick<ChainEntity, 'uuid' | 'name' | 'imageUrl'>;
  event: Pick<EventEntity, 'id' | 'name' | 'description'>;
};

export type WorkflowLogSummary = Pick<
  WorkflowLogEntity,
  'id' | 'status' | 'startedAt' | 'finishedAt' | 'input'
> & {
  chain: Pick<ChainEntity, 'uuid' | 'name' | 'imageUrl'>;
  workflow: Pick<WorkflowEntity, 'id' | 'name'>;
};

export class ProcessWorkflowInput {
  event: Pick<EventEntity, 'id' | 'name' | 'description'> &
    EventRawData & { time: Date };
  workflow: Pick<WorkflowEntity, 'id' | 'name'>;
  chain: Pick<ChainEntity, 'uuid' | 'name'>;
  user: UserEntity;
}

export function createProcessWorkflowInput(
  workflow: Workflow,
  eventData: EventRawData,
  user: UserEntity,
): ProcessWorkflowInput {
  return {
    event: {
      ...pick(workflow.event, ['id', 'name', 'description']),
      ...eventData,
      time: new Date(eventData.timestamp),
    },
    workflow: pick(workflow, ['id', 'name']),
    chain: pick(workflow.chain, ['uuid', 'name']),
    user,
  };
}
