import { User } from '../../user/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { WorkflowStatus } from '../workflow.type';
import { ApiProperty } from '@nestjs/swagger';
import { EventEntity } from '../../event/event.entity';

@Entity()
export class WorkflowEntity {
  @ApiProperty({ example: 1 })
  @PrimaryColumn({ type: 'char', length: 26 })
  id: string;

  @Column({ type: 'text' })
  status: WorkflowStatus;

  @Column({ type: 'text' })
  name: string;

  @Column({ name: 'updatedAt', type: 'timestamptz' })
  updatedAt: string;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'userId', referencedColumnName: 'id' }])
  user: User;

  @Column({ name: 'userId' })
  userId: string;

  @Column({ type: 'text', name: 'eventId' })
  eventId: string;

  @ManyToOne(() => EventEntity, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'eventId', referencedColumnName: 'uuid' }])
  event: EventEntity;
}
