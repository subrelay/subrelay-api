import { Injectable } from '@nestjs/common';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { PortableType, Si1Field } from '@polkadot/types/interfaces';
import {
  ChainInfo,
  ErrorDef,
  EventDef,
  GeneralTypeEnum,
  ObjectSchema,
  TypeSchema,
} from './substrate.data';

import { keyBy, mapValues } from 'lodash';

@Injectable()
export class SubstrateService {
  async createAPI(rpc: string): Promise<ApiPromise> {
    const wsProvider = new WsProvider(rpc);
    return await ApiPromise.create({ provider: wsProvider });
  }

  async getChainInfo(api: ApiPromise): Promise<ChainInfo> {
    const block = await api.rpc.chain.getBlock();
    const apiAt = await api.at(block.block.header.hash);

    const metadata = await api.runtimeMetadata;
    const allTypes = metadata.asLatest.lookup
      .types as unknown as PortableType[];
    const events: EventDef[] = this.parseEventsDef(allTypes, apiAt.events);

    const chainInfo = {
      chainId: apiAt.runtimeVersion.specName.toString(),
      chainTokens: apiAt.registry.chainTokens,
      chainDecimals: apiAt.registry.chainDecimals,
      runtimeVersion: `${apiAt.runtimeVersion.specVersion.toNumber()}`,
      metadataVersion: metadata.version,
      events,
    };

    api.disconnect();
    return chainInfo;
  }

  isPrimitiveType(type: string) {
    return [
      GeneralTypeEnum.BOOL as string,
      GeneralTypeEnum.NUMBER as string,
      GeneralTypeEnum.STRING as string,
    ].includes(type);
  }

  private parseEventsDef(
    types: PortableType[],
    defs: any,
  ): EventDef[] | ErrorDef[] {
    return Object.keys(defs).flatMap((pallet) => {
      return Object.keys(defs[pallet]).map((eventName) => {
        const eventMeta = defs[pallet][eventName].meta;
        const dataSchema: ObjectSchema = {
          type: GeneralTypeEnum.OBJECT,
          properties: mapValues(keyBy(eventMeta.fields, 'name'), (field) =>
            this.parseFieldSchema(types, field),
          ),
        };

        return {
          name: eventMeta.name.toString(),
          dataSchema: dataSchema,
          description: eventMeta.docs.join(' '),
          pallet,
          index: eventMeta.index as unknown as number,
        };
      });
    });
  }

  private parseFieldSchema(types: PortableType[], field: Si1Field): TypeSchema {
    const typeDef = types.find((type) => type.id.eq(field.type));

    if (typeDef.type.def.isPrimitive) {
      return {
        type: this.parsePrimitiveType(typeDef),
        description: field.docs.join(''),
      };
    }

    return {
      type: field.typeName.toString(),
      description: field.docs.join(''),
    };
  }

  private parsePrimitiveType(type: PortableType): GeneralTypeEnum {
    if (type.type.def.asPrimitive.isStr || type.type.def.asPrimitive.isChar) {
      return GeneralTypeEnum.STRING;
    }

    if (type.type.def.asPrimitive.isBool) {
      return GeneralTypeEnum.BOOL;
    }

    const number_regex = new RegExp('^(U|I)(8|16|32|64|128|256)$');
    if (number_regex.test(type.type.def.asPrimitive.type)) {
      return GeneralTypeEnum.NUMBER;
    }

    throw new Error('This type does not supported yet');
  }
}
