import { Injectable } from '@nestjs/common';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { Vec } from '@polkadot/types-codec';
import {
  Header,
  PortableType,
  RuntimeVersion,
  Si1Field,
  Si1LookupTypeId,
} from '@polkadot/types/interfaces';
import {
  ChainInfo,
  ErrorDef,
  EventDef,
  FieldDef,
  GeneralTypeEnum,
  TypeDef,
} from './substrate.data';

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
    const allTypes = metadata.asLatest.lookup.types;
    const events: EventDef[] = this.parseEventsDef(allTypes, apiAt.events);
    const errors: ErrorDef[] = this.parseEventsDef(allTypes, apiAt.errors);

    return {
      chainId: apiAt.runtimeVersion.specName.toString(),
      chainTokens: apiAt.registry.chainTokens,
      chainDecimals: apiAt.registry.chainDecimals,
      runtimeVersion: `${apiAt.runtimeVersion.specVersion.toNumber()}`,
      metadataVersion: metadata.version,
      types: allTypes,
      events,
      errors,
    };
  }

  private parseEventsDef(
    types: Vec<PortableType>,
    defs: any,
  ): EventDef[] | ErrorDef[] {
    return Object.keys(defs).flatMap((pallet) => {
      return Object.keys(defs[pallet]).map((eventName) => {
        const eventMeta = defs[pallet][eventName].meta;
        const fieldDefs: FieldDef[] = eventMeta.fields.map((field, index) =>
          this.parseFieldDef(types, field, `${index}`),
        );

        return {
          name: eventMeta.name.toString(),
          fields: fieldDefs,
          description: eventMeta.docs.join(' '),
          pallet,
          index: eventMeta.index as unknown as number,
        };
      });
    });
  }

  private parseFieldDef(
    types: Vec<PortableType>,
    field: Si1Field,
    spareName: string = 'null',
  ): FieldDef {
    return {
      name: field.name.isNone ? `${spareName}` : field.name.value.toString(),
      description: field.docs.join(''),
      typeDef: this.parseTypeDef(types, field.type),
    };
  }

  private parseTypeDef(types: Vec<PortableType>, id: Si1LookupTypeId): TypeDef {
    const typeDef = types.find((type) => type.id.eq(id));

    if (typeDef.type.def.isPrimitive) {
      return {
        originalType: typeDef.type.def.type,
        type: this.parsePrimitiveTypeDef(types, typeDef),
      };
    }

    if (typeDef.type.def.isArray) {
      return {
        type: GeneralTypeEnum.ARRAY,
        originalType: typeDef.type.def.type,
        def: this.parseTypeDef(types, typeDef.type.def.asArray.type),
      };
    }

    if (typeDef.type.def.isTuple) {
      return {
        type: GeneralTypeEnum.TUPLE,
        originalType: typeDef.type.def.type,
        def: typeDef.type.def.asTuple.map((typeId) =>
          this.parseTypeDef(types, typeId),
        ),
      };
    }

    if (typeDef.type.def.isComposite) {
      return {
        type: GeneralTypeEnum.OBJECT,
        originalType: typeDef.type.def.type,
        def: typeDef.type.def.asComposite.fields.map((field, index) =>
          this.parseFieldDef(types, field, `${index}`),
        ),
      };
    }

    return {
      type: GeneralTypeEnum.UNKNOWN,
      originalType: typeDef.type.def.type,
    };
  }

  private parsePrimitiveTypeDef(
    types: Vec<PortableType>,
    type: PortableType,
  ): GeneralTypeEnum {
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

    return GeneralTypeEnum.UNKNOWN;
  }

  async getTimestamp(api: ApiPromise, hash: Uint8Array): Promise<any> {
    const [block, records] = await Promise.all([
      api.rpc.chain.getBlock(hash),
      api.query.system.events.at(hash),
    ]);
    const encodedLength = block.encodedLength;
    const { header, extrinsics } = block.block || {};
    const timestampArgs = extrinsics
      .map((e) => e.method)
      .find((m) => m.section === 'timestamp' && m.method === 'set');
    const timestamp = Number(timestampArgs?.args[0].toString()) || Date.now();
    return { header, extrinsics, records, timestamp, encodedLength };
  }

  private buildVersion(version: RuntimeVersion): string {
    return `${version.specName}_${version.implName}_${version.specVersion}`;
  }

  async subscribeNewFinalizedBlock(): Promise<void> {
    // let api = await this.createAPI();
    // await api.rpc.chain.subscribeFinalizedHeads(
    //   async (lastHeader: Header): Promise<void> => {
    //     const [block, chainData] = await Promise.all([
    //       api.rpc.chain.getBlock(
    //         '0xf785b35913513e4b5b100aed85efccba7d7b7d25e6f86d4f838355f0832cce61',
    //       ),
    //       api.at(
    //         '0xf785b35913513e4b5b100aed85efccba7d7b7d25e6f86d4f838355f0832cce61',
    //       ),
    //     ]);
    // console.log({ extrinsics });
    // const extrinsics = parseExtrinsics(block.block.extrinsics);
    // const eventMetadata = await api.events;
    //   console.log({ eventMetadata });
    // const block_records = await chainData.events;
    // writeFileSync('event_records_1.json', JSON.stringify(block_records));
    // const data = block_records.toHuman() as unknown as EventRecord[];
    //   console.log({ extrinsics });
    //   const events = records.toJSON();
    // const records = chainData.records;
    // const events = data.map((record) => new Event(record, eventMetadata));
    // console.log({ events: JSON.stringify(events) });
    //   const tmp = await api.events;
    //   console.log({ tmp });
    // const result = {
    //   events,
    //   block: {
    //     number: block.block.number,
    //     // timestamp: events,
    //   },
    //   extrinsics: extrinsicsData,
    // };
    // console.log({ result });
    //     console.log('--------------------------------------------------------');
    //   },
    // );
  }
}
