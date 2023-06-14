import { ChainEntity } from '../chain/chain.entity';
import { Column, Entity, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { TypeSchema } from '../substrate/substrate.type';
import { ChainSummary } from '../chain/chain.dto';

@Entity('event')
export class EventEntity {
  @PrimaryColumn({ type: 'char', length: 26 })
  id: string;

  @Column()
  name: string;

  @Column({ type: 'jsonb', name: 'schema' })
  schema: TypeSchema[];

  @Column({ nullable: true })
  description?: string;

  @Column()
  index: number;

  @Column({ type: 'char', length: 26, name: 'chainUuid' })
  chainUuid: string;

  @ManyToOne(() => ChainEntity, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'chainUuid', referencedColumnName: 'uuid' }])
  chain?: ChainSummary;
}
