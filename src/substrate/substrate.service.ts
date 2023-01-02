import { Injectable } from '@nestjs/common';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { PortableType, Si1Field } from '@polkadot/types/interfaces';
import {
  ChainInfo,
  ErrorDef,
  EventDef,
  GeneralTypeEnum,
  TypeSchema,
} from './substrate.data';

import { map } from 'lodash';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AppEvent } from 'src/common/app-event.type';

@Injectable()
export class SubstrateService {
  constructor(private eventEmitter: EventEmitter2) {}

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

  async subscribeNewHeads(api: ApiPromise, chainUuid: string) {
    await api.rpc.chain.subscribeFinalizedHeads((lastHeader) => {
      this.eventEmitter.emit(
        AppEvent.BLOCK_CREATED,
        api.rpc,
        lastHeader.hash as unknown as string,
        chainUuid,
      );
    });
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

        let dataSchema: TypeSchema[];
        if (eventMeta.fields) {
          dataSchema = map(eventMeta.fields, (field) =>
            this.parseFieldSchema(
              field,
              types.find((type) => type.id.eq(field.type)),
            ),
          );
        }

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

  private parseFieldSchema(field: Si1Field, typeDef: PortableType): TypeSchema {
    const schema = this.parseTypeSchema(typeDef);

    return {
      ...schema,
      name: field.name.toString(),
      typeName: field.typeName.toString(),
      description: field.docs.join(''),
    };
  }

  private parseTypeSchema(typeDef: PortableType): TypeSchema {
    if (typeDef.type.def.isPrimitive) {
      return {
        ...this.parsePrimitiveType(typeDef),
        description: typeDef.type.docs.join(''),
      };
    }

    return {
      type: GeneralTypeEnum.UNKNOWN,
      typeName: typeDef.type.def.type,
      description: typeDef.type.docs.join(''),
    };
  }

  private parsePrimitiveType(typeDef: PortableType): {
    type: GeneralTypeEnum;
    typeName: string;
  } {
    let type: GeneralTypeEnum = GeneralTypeEnum.UNKNOWN;
    if (
      typeDef.type.def.asPrimitive.isStr ||
      typeDef.type.def.asPrimitive.isChar
    ) {
      type = GeneralTypeEnum.STRING;
    }

    if (typeDef.type.def.asPrimitive.isBool) {
      type = GeneralTypeEnum.BOOL;
    }

    const number_regex = new RegExp('^(U|I)(8|16|32|64|128|256)$');
    if (number_regex.test(typeDef.type.def.asPrimitive.type)) {
      type = GeneralTypeEnum.NUMBER;
    }

    return {
      type,
      typeName: typeDef.type.def.asPrimitive.type,
    };
  }
}
