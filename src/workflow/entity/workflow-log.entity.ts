import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { TaskStatus } from '../../task/type/task.type';
import { WorkflowEntity } from './workflow.entity';

@Entity({ name: 'workflow_log' })
export class WorkflowLogEntity {
  @PrimaryColumn({ type: 'char', length: 26 })
  id: string;

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
  status: TaskStatus;

  @Column({ nullable: false, type: 'jsonb' })
  input: any;

  @ManyToOne(() => WorkflowEntity, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'workflowId', referencedColumnName: 'id' }])
  workflow: WorkflowEntity;

  @Column({ name: 'workflowId' })
  workflowId: string;
}
