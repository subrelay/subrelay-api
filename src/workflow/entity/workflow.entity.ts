import { User } from '../../user/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { WorkflowStatus } from '../workflow.type';
import { ApiProperty } from '@nestjs/swagger';
import { EventEntity } from '../../event/event.entity';

@Entity('workflow')
export class WorkflowEntity {
  @ApiProperty({ example: 1 })
  @PrimaryColumn({ type: 'char', length: 26 })
  id: string;

  @Column({ type: 'text' })
  status: WorkflowStatus;

  @Column({ type: 'text' })
  name: string;

  @Column({ name: 'updatedAt', type: 'timestamptz' })
  updatedAt: Date;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'userId', referencedColumnName: 'id' }])
  user: User;

  @Column({ name: 'userId', type: 'char', length: 26 })
  userId: string;

  @Column({ type: 'char', length: 26, name: 'eventId' })
  eventId: string;

  @ManyToOne(() => EventEntity, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'eventId', referencedColumnName: 'id' }])
  event: EventEntity;
}
