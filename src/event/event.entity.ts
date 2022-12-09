import { Chain } from '../chain/chain.entity';
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { GeneralTypeEnum, ObjectSchema } from '../substrate/substrate.data';

@Entity()
export class Event {
  @PrimaryGeneratedColumn('increment')
  id: number;

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

export class EventDetail extends Event {
  fields: SupportedFilterField[];
}

export class SupportedFilterField {
  name: string;
  description?: string;
  type: GeneralTypeEnum;
}
