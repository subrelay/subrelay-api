import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { WorkflowVersion } from './workflow-version.entity';
import { EventData } from '../../common/queue.type';
import { ProcessStatus } from '../../task/type/task.type';

@Entity({ name: 'workflow_log' })
export class WorkflowLog {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn({
    name: 'startedAt',
  })
  startedAt?: string;

  @Column({
    nullable: true,
    name: 'finishedAt',
    type: 'time without time zone',
  })
  finishedAt?: string;

  @Column({ nullable: false, type: 'text' })
  status: ProcessStatus;

  @Column({ nullable: false, type: 'jsonb' })
  input: EventData;

  @ManyToOne(() => WorkflowVersion, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'workflowVersionId', referencedColumnName: 'id' }])
  workflowVersion: WorkflowVersion;

  @Column({ name: 'workflowVersionId' })
  workflowVersionId: number;
}
