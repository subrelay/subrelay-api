import { GeneralTypeEnum } from '../substrate/substrate.type';
import { EventEntity } from './event.entity';
import { EventSummary } from './event.type';

export class DataField {
  name: string;

  description?: string;

  data?: any;

  type: GeneralTypeEnum;

  originalType?: string;

  display?: string;
}

export type GetOneEventResponse = EventSummary & {
  fields: DataField[];
};

export type GetEventsResponse = Pick<
  EventEntity,
  'id' | 'name' | 'description'
>;
