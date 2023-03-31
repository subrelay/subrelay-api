import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { TaskType } from '../type/task.type';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkflowEntity } from '../../workflow/entity/workflow.entity';

@Entity('task')
export class TaskEntity {
  @ApiProperty({ example: 1 })
  @PrimaryColumn({ type: 'char', length: 26 })
  id: string;

  @ApiProperty({ example: TaskType.FILTER, enum: TaskType })
  @Column({ nullable: false, type: 'text' })
  type: TaskType;

  @ApiProperty({ example: 'Task 1' })
  @Column({ nullable: false })
  name: string;

  @ApiPropertyOptional({ example: 2 })
  @Column({ nullable: true, name: 'dependOn', type: 'char', length: 26 })
  dependOn?: string;

  @Column({ nullable: false, type: 'jsonb' })
  config: any;

  @ManyToOne(() => WorkflowEntity, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'workflowId', referencedColumnName: 'id' }])
  workflow: WorkflowEntity;

  @Column({ name: 'workflowId', type: 'char', length: 26 })
  workflowId: string;
}
