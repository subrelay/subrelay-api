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

  @Column({
    name: 'key',
    default: () => 'substring(sha256(gen_random_uuid()::text::bytea)::text, 2)',
    nullable: false,
  })
  key: string;

  @Column({ type: 'jsonb' })
  integration: UserIntegration;
}
