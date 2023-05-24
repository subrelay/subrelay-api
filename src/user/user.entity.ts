import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
import { UserIntegration } from './user.type';

@Entity('user')
export class UserEntity {
  @PrimaryColumn({ type: 'char', length: 26 })
  id: string;

  @Column()
  address: string;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  integration?: UserIntegration;
}
