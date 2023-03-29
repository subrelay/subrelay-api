import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { WorkflowLogEntity } from '../../workflow/entity/workflow-log.entity';
import { TaskStatus } from '../type/task.type';
import { TaskEntity } from './task.entity';

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
  status: TaskStatus;

  @ManyToOne(() => WorkflowLogEntity, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'workflowLogId', referencedColumnName: 'id' }])
  workflowLog: WorkflowLogEntity;

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
