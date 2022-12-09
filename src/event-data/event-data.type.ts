import { EventRecord } from '@polkadot/types/interfaces';

export class EventRawData {
  timestamp: number;
  hash: string;
  success: boolean;
  records: EventRecord[];
  chainUuid: string;
}
