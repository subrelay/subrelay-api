import { PortableType } from '@polkadot/types/interfaces';
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { ErrorDef } from '../substrate/substrate.data';

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

  // @Column({ nullable: false, type: 'jsonb' })
  // types: PortableType[];

  // @Column({ nullable: false, type: 'jsonb' })
  // errors: ErrorDef[];
}
