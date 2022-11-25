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

@Entity()
export class Workflow {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  status: WorkflowStatus;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'userId', referencedColumnName: 'id' }])
  user: User;

  @Column({ name: 'userId' })
  userId: number;
}
