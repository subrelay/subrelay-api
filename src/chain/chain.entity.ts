import { EventEntity } from '../event/event.entity';
import {
  Column,
  Entity,
  CreateDateColumn,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';

export class ChainConfig {
  rpcs: string[];
  metadataVersion: number;
  chainTokens: string[];
  chainDecimals: number[];
}

@Entity('chain')
export class ChainEntity {
  @PrimaryColumn({ type: 'char', length: 26 })
  uuid: string;

  @Column({ nullable: false, name: 'chainId' })
  chainId: string;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: string;

  @Column({ nullable: false })
  version: string;

  @Column({ nullable: false })
  name: string;

  @Column({ nullable: false, name: 'imageUrl' })
  imageUrl: string;

  @Column({ nullable: false, type: 'jsonb' })
  config: ChainConfig;

  @OneToMany(() => EventEntity, (event) => event.chain, { lazy: true })
  events: EventEntity[];
}
