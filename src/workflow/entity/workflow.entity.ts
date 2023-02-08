import { User } from '../../user/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { WorkflowStatus } from '../workflow.type';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class Workflow {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ enum: WorkflowStatus, example: WorkflowStatus.RUNNING })
  @Column({ type: 'text' })
  status: WorkflowStatus;

  @ApiProperty({ example: '2022-11-18T00:52:30.082Z' })
  @CreateDateColumn({ name: 'createdAt' })
  createdAt: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'userId', referencedColumnName: 'id' }])
  user: User;

  @Column({ name: 'userId' })
  userId: number;
}
