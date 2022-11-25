import { WorkflowVerson } from 'src/workflow/entity/workflow-version.entity';
import { Workflow } from 'src/workflow/entity/workflow.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AbsConfig, TaskType } from '../type/task.type';

@Entity()
export class Task {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false, type: 'text' })
  type: TaskType;

  @Column({ nullable: false })
  name: string;

  @Column({ nullable: true, name: 'dependOn' })
  dependOn?: number;

  @Column({ nullable: false, type: 'jsonb' })
  config: AbsConfig;

  @ManyToOne(() => WorkflowVerson, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'workflowVersionId', referencedColumnName: 'id' }])
  workflowVersion: WorkflowVerson;

  @Column({ name: 'workflowVersionId' })
  workflowVersionId: number;
}
