import { WorkflowVersion } from '../../workflow/entity/workflow-version.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  AbsConfig,
  ProcessStatus,
  TaskOutput,
  TaskType,
} from '../type/task.type';
import { Task } from './task.entity';
import { WorkflowLog } from 'src/workflow/entity/workflow-log.entity';

@Entity()
export class TaskLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    nullable: false,
    name: 'startedAt',
    type: 'time without time zone',
  })
  startedAt?: string;

  @Column({
    nullable: true,
    name: 'finishedAt',
    type: 'time without time zone',
  })
  finishedAt?: string;

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
