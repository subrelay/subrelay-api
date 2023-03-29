import { Chain } from '../chain/chain.entity';
import { WorkflowEntity } from './entity/workflow.entity';

export enum WorkflowStatus {
  RUNNING = 'running',
  PAUSING = 'pausing',
}

export type Workflow = Pick<
  WorkflowEntity,
  'id' | 'name' | 'status' | 'createdAt' | 'updatedAt'
> & { chain: { uuid: Chain['uuid']; name: Chain['name'] } };
