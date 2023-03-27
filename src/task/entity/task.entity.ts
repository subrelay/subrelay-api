import { WorkflowVersion } from '../../workflow/entity/workflow-version.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TaskType } from '../type/task.type';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity('task')
export class TaskEntity {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: TaskType.TRIGGER, enum: TaskType })
  @Column({ nullable: false, type: 'text' })
  type: TaskType;

  @ApiProperty({ example: 'Task 1' })
  @Column({ nullable: false })
  name: string;

  @ApiPropertyOptional({ example: 2 })
  @Column({ nullable: true, name: 'dependOn' })
  dependOn?: number;

  @Column({ nullable: false, type: 'jsonb' })
  config: any;

  @ManyToOne(() => WorkflowVersion, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'workflowVersionId', referencedColumnName: 'id' }])
  workflowVersion: WorkflowVersion;

  @ApiProperty({ example: 3 })
  @Column({ name: 'workflowVersionId' })
  workflowVersionId: number;
}
