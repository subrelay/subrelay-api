import { PortableType } from '@polkadot/types/interfaces';
import { CreateChainRequest } from 'src/chain/chain.dto';
import { Chain } from 'src/chain/chain.entity';

export class ChainInfo {
  chainId: string;
  chainTokens: string[];
  chainDecimals: number[];
  runtimeVersion: string;
  metadataVersion: number;
  types: PortableType[];
  events: EventDef[];
  errors: ErrorDef[];
}

export enum GeneralTypeEnum {
  OBJECT,
  ARRAY,
  NUMBER,
  STRING,
  UNKNOWN,
  BOOL,
  TUPLE,
}

export class FieldDef {
  name: string;
  description?: string;
  typeDef: TypeDef;
}

export class TypeDef {
  type: GeneralTypeEnum;
  originalType?: String;
  def?: FieldDef[] | TypeDef | TypeDef[];
}

export class EventDef {
  name: string;
  fields: FieldDef[];
  description?: string;
  pallet: string;
  index: number;
}

export type ErrorDef = EventDef;
