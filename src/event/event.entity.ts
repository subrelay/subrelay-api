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

@Entity()
export class Event {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn('increment')
  id: number;

  @ApiProperty({ example: 'Transfer' })
  @Column()
  name: string;

  @ApiProperty({ example: 'balances' })
  @Column()
  pallet: string;

  @Column({ type: 'jsonb', name: 'dataSchema' })
  dataSchema: TypeSchema[];

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
