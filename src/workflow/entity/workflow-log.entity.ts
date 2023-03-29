import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EventData } from '../../common/queue.type';
import { ProcessStatus } from '../../task/type/task.type';
import { WorkflowEntity } from './workflow.entity';

@Entity({ name: 'workflow_log' })
export class WorkflowLogEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn({
    name: 'startedAt',
  })
  startedAt?: Date;

  @Column({
    nullable: true,
    name: 'finishedAt',
    type: 'timestamptz',
  })
  finishedAt?: Date;

  @Column({ nullable: false, type: 'text' })
  status: ProcessStatus;

  @Column({ nullable: false, type: 'jsonb' })
  input: EventData;

  @ManyToOne(() => WorkflowEntity, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'workflowId', referencedColumnName: 'id' }])
  workflow: WorkflowEntity;

  @Column({ name: 'workflowId' })
  workflowId: number;
}
