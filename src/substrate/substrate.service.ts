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

import { isEmpty, map } from 'lodash';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AppEvent } from 'src/common/app-event.type';
import { writeFileSync } from 'fs';

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
    writeFileSync('events.json', JSON.stringify(allTypes));
    writeFileSync('chain-event.json', JSON.stringify(apiAt.events));
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
          let fieldsString = eventMeta.docs.join(' ').match(/\[(.)+\]/);
          fieldsString = fieldsString && fieldsString[0].replace(/ /g, '');
          const fieldNames = fieldsString
            ? fieldsString.substring(1, fieldsString.length - 1).split(',')
            : [];

          dataSchema = map(eventMeta.fields, (field, index) => {
            const result = this.parseFieldSchema(
              field,
              eventMeta.args[index].toString(),
            );
            if (isEmpty(result.name)) {
              result.name = fieldNames[index] || index;
            }

            return result;
          });
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

  private parseFieldSchema(field: Si1Field, arg: string): TypeSchema {
    const schema = this.parseArgType(arg);

    return {
      ...schema,
      name: field.name.toString(),
      typeName: field.typeName.toString(),
      description: field.docs.join(''),
    };
  }

  private parseArgType(arg: string): {
    type: GeneralTypeEnum;
    example?: any;
  } {
    if (arg === 'Bool') {
      return {
        type: GeneralTypeEnum.BOOL,
        example: true,
      };
    }

    if (arg === 'Str') {
      return {
        type: GeneralTypeEnum.STRING,
        example: 'This is an example',
      };
    }

    const number_regex = new RegExp('^(u|i|U|I)(8|16|32|64|128|256)$');
    if (number_regex.test(arg)) {
      return {
        type: GeneralTypeEnum.NUMBER,
        example: this.generateSampleForNumber(arg),
      };
    }

    console.log({ arg });

    if (arg === 'AccountId32') {
      return {
        type: GeneralTypeEnum.STRING,
        example: '13SDfVdrBaUrnoV7tMfvrGrxxANr1iJNEcPCmqZzF9FCpX8c',
      };
    }

    if (arg === 'H256') {
      return {
        type: GeneralTypeEnum.STRING,
        example:
          '0xdf018e32a08be6b0ad789c166410497f844d1077b40bea08073cedae58216aa5',
      };
    }

    return {
      type: GeneralTypeEnum.UNKNOWN,
    };
  }

  generateSampleForNumber(arg) {
    const mapping = {
      u8: 10,
      u16: 1_000,
      u32: 100_000_000,
      u64: 100_000_000,
      u128: 100_000_000,
      u256: 100_000_000,
    };
    return mapping[arg];
  }
}
