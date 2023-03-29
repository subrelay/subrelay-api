import { GeneralTypeEnum } from '../substrate/substrate.data';
import { EventSummary } from './event.type';

export class EventDataField {
  name: string;

  description?: string;

  data?: any;

  type: GeneralTypeEnum;

  supportFilter: boolean;

  supportCustomMessage: boolean;
}

export type GetOneEventResponse = EventSummary & {
  fields: EventDataField[];
};

export type GetEventsResponse = EventSummary;
