import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ProcessStatus } from '../type/task.type';
import { TaskEntity } from './task.entity';
import { WorkflowLog } from '../../workflow/entity/workflow-log.entity';

@Entity('task_log')
export class TaskLogEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    nullable: true,
    name: 'startedAt',
    type: 'timestamptz',
  })
  startedAt?: Date;

  @Column({
    nullable: true,
    name: 'finishedAt',
    type: 'timestamptz',
  })
  finishedAt?: Date;

  @Column({ nullable: false })
  status: ProcessStatus;

  @ManyToOne(() => WorkflowLog, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'workflowLogId', referencedColumnName: 'id' }])
  workflowLog: WorkflowLog;

  @Column({ name: 'workflowLogId' })
  workflowLogId: number;

  @ManyToOne(() => TaskEntity, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'taskId', referencedColumnName: 'id' }])
  task: TaskEntity;

  @Column({ name: 'taskId' })
  taskId: number;

  @Column({ type: 'jsonb', nullable: true })
  output: any;

  @Column({ type: 'jsonb', nullable: true })
  input: any;

  @Column({ type: 'jsonb', nullable: true })
  error: any;
}
