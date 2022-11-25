import { Chain } from '../../chain/chain.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Workflow } from './workflow.entity';

@Entity({ name: 'workflow_version' })
export class WorkflowVerson {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: string;

  @ManyToOne(() => Workflow, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'workflowId', referencedColumnName: 'id' }])
  workflow: Workflow;

  @Column({ name: 'workflowId' })
  workflowId: number;

  @Column({ type: 'text', name: 'chainUuid' })
  chainUuid: string;

  @ManyToOne(() => Chain, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'chainUuid', referencedColumnName: 'uuid' }])
  chain: Chain;
}
