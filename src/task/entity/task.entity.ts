import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { TaskType } from '../type/task.type';
import { WorkflowEntity } from '../../workflow/entity/workflow.entity';

@Entity('task')
export class TaskEntity {
  @PrimaryColumn({ type: 'char', length: 26 })
  id: string;

  @Column({ nullable: false, type: 'text' })
  type: TaskType;

  @Column({ nullable: false })
  name: string;

  @Column({ nullable: true, name: 'dependOn', type: 'char', length: 26 })
  dependOn?: string;

  @Column({ nullable: false, type: 'jsonb' })
  config: any;

  @ManyToOne(() => WorkflowEntity, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'workflowId', referencedColumnName: 'id' }])
  workflow?: WorkflowEntity;

  @Column({ name: 'workflowId', type: 'char', length: 26 })
  workflowId: string;
}
