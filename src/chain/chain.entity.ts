import { EventEntity } from '../event/event.entity';
import {
  Column,
  Entity,
  CreateDateColumn,
  OneToMany,
  PrimaryColumn,
  // OneToMany,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export class ChainConfig {
  @ApiProperty({ example: ['wss://rpc.polkadot.io'] })
  rpcs: string[];

  @ApiProperty({ example: 14 })
  metadataVersion: number;

  @ApiProperty({ example: ['DOT'] })
  chainTokens: string[];

  @ApiProperty({ example: [10] })
  chainDecimals: number[];
}

@Entity('chain')
export class ChainEntity {
  @ApiProperty({
    example: '3342b0eb-ab4f-40c0-870c-6587de6b009a',
  })
  @PrimaryColumn({ type: 'char', length: 26 })
  uuid: string;

  @ApiProperty({ example: 'polkadot' })
  @Column({ nullable: false, name: 'chainId' })
  chainId: string;

  @ApiProperty({ example: '2022-11-18T00: 51: 30.082Z' })
  @CreateDateColumn({ name: 'createdAt' })
  createdAt: string;

  @ApiProperty({ example: '9300' })
  @Column({ nullable: false })
  version: string;

  @ApiProperty({ example: 'Polkadot' })
  @Column({ nullable: false })
  name: string;

  @ApiProperty({
    example: 'https://cryptologos.cc/logos/polkadot-new-dot-logo.png?v=023',
  })
  @Column({ nullable: false, name: 'imageUrl' })
  imageUrl: string;

  @ApiProperty()
  @Column({ nullable: false, type: 'jsonb' })
  config: ChainConfig;

  @OneToMany(() => EventEntity, (event) => event.chain, { lazy: true })
  events: EventEntity[];
}
