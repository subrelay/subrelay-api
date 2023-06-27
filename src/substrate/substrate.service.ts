import { Injectable } from '@nestjs/common';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { PortableType, Si1Field } from '@polkadot/types/interfaces';
import {
  ChainInfo,
  ErrorDef,
  EventDef,
  GeneralTypeEnum,
  TypeSchema,
} from './substrate.type';

import { isEmpty, map, random } from 'lodash';
import { blake2AsHex } from '@polkadot/util-crypto';
import { ulid } from 'ulid';
import * as base58 from 'bs58';
import { numberToHex } from '@polkadot/util';

@Injectable()
export class SubstrateService {
  constructor() {}

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

  parseEventsDef(
    types: PortableType[],
    defs: any,
  ): EventDef[] | ErrorDef[] {
    return Object.keys(defs).flatMap((pallet) => {
      return Object.keys(defs[pallet]).map((eventName) => {
        const eventMeta = defs[pallet][eventName].meta;

        let dataSchema: TypeSchema[];
        const description: string = eventMeta.docs.join(' ');
        if (eventMeta.fields) {
          const fieldsStringMatches = description.match(/\[(.)+\]/);
          const fieldNames = [];

          if (!isEmpty(fieldsStringMatches)) {
            const fieldsString = fieldsStringMatches[0].replace(/ /g, '');
            fieldNames.push(
              ...fieldsString.substring(1, fieldsString.length - 1).split(','),
            );
            description.substring(0, description.indexOf(fieldsString));
          }

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
          name: `${pallet}.${eventMeta.name.toString()}`,
          schema: dataSchema,
          description,
          index: eventMeta.index as unknown as number,
        };
      });
    });
  }

  parseFieldSchema(field: Si1Field, arg: string): TypeSchema {
    const schema = this.parseArgType(arg);

    return {
      ...schema,
      name: field.name.toString(),
      typeName: field.typeName.toString(),
      description: field.docs.join(''),
    };
  }

  parseArgType(arg: string): {
    type: GeneralTypeEnum;
    example?: any;
    originalType: string;
  } {
    if (arg === 'Bool') {
      return {
        type: GeneralTypeEnum.BOOL,
        example: true,
        originalType: arg,
      };
    }

    if (arg === 'Str') {
      return {
        type: GeneralTypeEnum.STRING,
        example: 'This is an example',
        originalType: arg,
      };
    }

    const integer_number_regex = new RegExp('^(i|I)(8|16|32|64|128|256)$');
    if (integer_number_regex.test(arg)) {
      return {
        type: GeneralTypeEnum.NUMBER,
        example: this.generateInteger(arg),
        originalType: arg,
      };
    }

    const float_number_regex = new RegExp('^(u|U)(8|16|32|64|128|256)$');
    if (float_number_regex.test(arg)) {
      return {
        type: GeneralTypeEnum.NUMBER,
        example: this.generateFloat(arg),
        originalType: arg,
      };
    }

    if (arg === 'AccountId32') {
      return {
        type: GeneralTypeEnum.STRING,
        example: this.generateAddress(),
        originalType: arg,
      };
    }

    if (arg === 'H256') {
      return {
        type: GeneralTypeEnum.STRING,
        example: blake2AsHex(ulid()),
        originalType: arg,
      };
    }

    return {
      type: GeneralTypeEnum.UNKNOWN,
      originalType: arg,
    };
  }

  generateFloat(arg) {
    const mapping = {
      u8: random(10),
      u16: random(100) * 1_000,
      u32: random(100) * 1_000,
      u64: random(100) * 1_000,
      u128: random(100) * 1_000,
      u256: random(100) * 1_000,
    };
    return mapping[arg];
  }

  generateInteger(arg) {
    const mapping = {
      i8: random(10),
      i16: random(100) * 1_000,
      i32: random(100) * 1_000,
      i64: random(100) * 1_000,
      i128: random(100) * 1_000,
      i256: random(100) * 1_000,
    };
    return mapping[arg];
  }

  generateAddress() {
    const address = base58.encode(Buffer.from(ulid()));
    // TODO Need generate address by chain?
    /*
    type PrefixPolkadot = 0;
    type PrefixKusama = 2;
    type PrefixSubstrate = 42;
    type DeprecatedPrefixBBQ = 68;
    */
    return `${numberToHex(0)}${address}`.replace('0x00', '');
  }
}
