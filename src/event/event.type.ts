import { EventEntity } from './event.entity';

export type EventSummary = Pick<
  EventEntity,
  'id' | 'name' | 'description' | 'chain'
>;
