import { Chain } from '../chain/chain.entity';
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TypeSchema } from '../substrate/substrate.data';
import { ApiProperty } from '@nestjs/swagger';

@Entity('event')
export class EventEntity {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn('increment')
  id: number;

  @ApiProperty({ example: 'balances.Transfer' })
  @Column()
  name: string;

  @Column({ type: 'jsonb', name: 'schema' })
  schema: TypeSchema[];

  @ApiProperty({ example: 'Transfer succeeded.' })
  @Column({ nullable: true })
  description?: string;

  @ApiProperty({ example: 2 })
  @Column()
  index: number;

  @ApiProperty({ example: '3342b0eb-ab4f-40c0-870c-6587de6b009a' })
  @Column({ type: 'text', name: 'chainUuid' })
  chainUuid: string;

  @ManyToOne(() => Chain, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'chainUuid', referencedColumnName: 'uuid' }])
  chain: Chain;
}
