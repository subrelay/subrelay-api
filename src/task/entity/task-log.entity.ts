import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ProcessStatus } from '../type/task.type';
import { Task } from './task.entity';
import { WorkflowLog } from '../../workflow/entity/workflow-log.entity';

@Entity()
export class TaskLog {
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

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'taskId', referencedColumnName: 'id' }])
  task: Task;

  @Column({ name: 'taskId' })
  taskId: number;

  @Column({ type: 'jsonb', nullable: true })
  output: any;
}
