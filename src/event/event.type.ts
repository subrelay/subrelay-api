import { EventRawData } from '../common/queue.type';
import { EventEntity } from './event.entity';

export type EventSummary = Pick<
  EventEntity,
  'id' | 'name' | 'description' | 'chain'
>;

export type EventData = Pick<EventEntity, 'id' | 'name' | 'description'> &
  Pick<EventRawData, 'success' | 'block' | 'data'> & {
    time: Date;
  };
