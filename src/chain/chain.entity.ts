import { Event } from '../event/event.entity';
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToMany,
  // OneToMany,
} from 'typeorm';

export class ChainConfig {
  rpcs: string[];
  metadataVersion: number;
  chainTokens: string[];
  chainDecimals: number[];
}

@Entity()
export class Chain {
  @PrimaryGeneratedColumn('uuid')
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

  @OneToMany(() => Event, (event) => event.chain, { lazy: true })
  events: Event[];
}
