import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { Pagination } from '../common/pagination.type';
import { GeneralTypeEnum } from '../substrate/substrate.data';
import { CustomMessageInput } from '../task/task.dto';
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
  sample: CustomMessageInput;

  fields: EventDataField[];
};

export type GetEventsResponse = EventSummary;
