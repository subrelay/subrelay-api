import { Chain } from '../chain/chain.entity';
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ObjectSchema } from '../substrate/substrate.data';

@Entity()
export class Event {
  @PrimaryGeneratedColumn('increment')
  id: string;

  @Column()
  name: string;

  @Column()
  pallet: string;

  @Column({ type: 'jsonb', name: 'dataSchema' })
  dataSchema: ObjectSchema;

  @Column({ nullable: true })
  description?: string;

  @Column()
  index: number;

  @Column({ type: 'text', name: 'chainUuid' })
  chainUuid: string;

  @ManyToOne(() => Chain, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'chainUuid', referencedColumnName: 'uuid' }])
  chain: Chain;
}
