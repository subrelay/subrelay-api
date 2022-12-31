import { EventRecord } from '@polkadot/types/interfaces';

export class ChainInfo {
  chainId: string;
  chainTokens: string[];
  chainDecimals: number[];
  runtimeVersion: string;
  metadataVersion: number;
  events: EventDef[];
}

export enum GeneralTypeEnum {
  OBJECT = 'object',
  ARRAY = 'array',
  NUMBER = 'number',
  STRING = 'string',
  UNKNOWN = 'unknown',
  BOOL = 'boolean',
}

export class EventDef {
  name: string;
  dataSchema: ObjectSchema;
  description?: string;
  pallet: string;
  index: number;
}

export class PrimitiveSchema {
  type: GeneralTypeEnum;
  description?: string;
}

export class UnknownSchema {
  type: string;
  description?: string;
}

export class ObjectSchema {
  type: GeneralTypeEnum;
  description?: string;
  properties?: {
    [key: string]: TypeSchema;
  };
}

export type ErrorDef = EventDef;

export type TypeSchema = PrimitiveSchema | ObjectSchema | UnknownSchema;
