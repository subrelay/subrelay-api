import { Chain } from '../chain/chain.entity';
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity({ name: 'block_data' })
export class EventData {
  @PrimaryGeneratedColumn('increment')
  id: string;

  @Column()
  timestamp: number;

  @Column({ type: 'text' })
  hash: string;

  @Column({ type: 'text' })
  success: boolean;

  @Column({ name: 'eventId' })
  eventId: number;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'eventId', referencedColumnName: 'id' }])
  event: Event;
}
