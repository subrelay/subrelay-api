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
  ENUM = 'enum',
}

export class EventDef {
  name: string;
  schema?: TypeSchema[];
  description?: string;
  index: number;
}

export class PrimitiveSchema {
  name?: string;
  type: GeneralTypeEnum;
  description?: string;
  typeName: string;
  example?: any;
}

export class UnknownSchema {
  name?: string;
  type: string;
  description?: string;
  typeName: string;
  example?: any;
}

export class ObjectSchema {
  name?: string;
  type: GeneralTypeEnum;
  typeName: string;
  description?: string;
  properties?: {
    [key: string]: TypeSchema;
  };
  example?: any;
}

export type ErrorDef = EventDef;

export type TypeSchema = PrimitiveSchema | ObjectSchema | UnknownSchema;
