import { ApiPromise } from '@polkadot/api';
import { SubstrateService } from './substrate.service';
import { GeneralTypeEnum } from './substrate.type';
import { Test } from '@nestjs/testing';
import { Si1Field } from '@polkadot/types/interfaces';

const events = {
  system: {
    ExtrinsicSuccess: {
      meta: {
        name: 'ExtrinsicSuccess',
        fields: [
          {
            name: 'dispatch_info',
            type: 22,
            typeName: 'DispatchInfo',
            docs: [],
          },
        ],
        index: 0,
        docs: ['An extrinsic completed successfully.'],
        args: [
          '{"weight":"SpWeightsWeightV2Weight","class":"FrameSupportDispatchDispatchClass","paysFee":"FrameSupportDispatchPays"}',
        ],
      },
    },
  },
  balances: {
    InvalidResponderVersion: {
      meta: {
        name: 'InvalidResponderVersion',
        fields: [
          {
            name: {
              toString: () => null,
            },
            type: 133,
            typeName: 'MultiLocation',
            docs: [],
          },
          {
            name: {
              toString: () => null,
            },
            type: 11,
            typeName: 'QueryId',
            docs: [],
          },
        ],
        index: 9,
        docs: [
          'Expected query response has been received but the expected origin location placed in',
          'storage by this runtime previously cannot be decoded. The query remains registered.',
          '',
          'This is unexpected (since a location placed in storage in a previously executing',
          'runtime should be readable prior to query timeout) and dangerous since the possibly',
          'valid response will be dropped. Manual governance intervention is probably going to be',
          'needed.',
          '',
          '\\[ origin location, id \\]',
        ],
        args: ['{"parents":"u8","interior":"XcmV3Junctions"}', 'u64'],
      },
    },
    Deposit: {
      meta: {
        name: 'Deposit',
        fields: [
          {
            name: {
              toString: () => 'who',
            },
            type: 0,
            typeName: 'T::AccountId',
            docs: [],
          },
          {
            name: {
              toString: () => 'who',
            },
            type: 6,
            typeName: 'T::Balance',
            docs: [],
          },
        ],
        index: 7,
        docs: ['Some amount was deposited (e.g. for transaction fees).'],
        args: ['AccountId32', 'u128'],
      },
    },
  },
};
jest.mock('@polkadot/api', () => ({
  WsProvider: jest.fn(),
  ApiPromise: {
    create: jest.fn().mockImplementation(() => ({
      disconnect: jest.fn(),
      rpc: {
        chain: {
          getBlock: jest.fn().mockResolvedValue({
            block: {
              header: {
                hash: '0x0000000000000000000000000000000000000000000000000000000000000000',
              },
            },
          }),
        },
      },
      at: jest.fn().mockResolvedValue({
        events,
        runtimeVersion: {
          specName: {
            toString: jest.fn().mockReturnValue('kusama'),
          },
          specVersion: {
            toNumber: jest.fn().mockReturnValue(9999),
          },
        },
        registry: {
          chainDecimals: [10],
          chainTokens: ['KSM'],
        },
      }),
      runtimeMetadata: {
        version: 123,
      },
    })),
  },
}));

describe('SubstrateService', () => {
  let service: SubstrateService;
  let api: ApiPromise;

  const rpcUrl = 'wss://kusama-rpc.polkadot.io/';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [SubstrateService],
    }).compile();

    service = moduleRef.get<SubstrateService>(SubstrateService);
  });

  describe('createAPI', () => {
    it('should create an instance of ApiPromise', async () => {
      const apiPromise = await service.createAPI(rpcUrl);
      expect(apiPromise).not.toBeUndefined();
      api = apiPromise;
    });
  });

  describe('getChainInfo', () => {
    it('should return correct chain info', async () => {
      const chainInfo = await service.getChainInfo(api);

      expect(chainInfo).toMatchObject({
        chainId: expect.any(String),
        chainTokens: expect.arrayContaining([expect.any(String)]),
        chainDecimals: expect.arrayContaining([expect.any(Number)]),
        runtimeVersion: expect.any(String),
        metadataVersion: expect.any(Number),
        events: [
          {
            name: 'system.ExtrinsicSuccess',
            schema: [
              {
                type: 'unknown',
                originalType:
                  '{"weight":"SpWeightsWeightV2Weight","class":"FrameSupportDispatchDispatchClass","paysFee":"FrameSupportDispatchPays"}',
                name: 'dispatch_info',
                typeName: 'DispatchInfo',
                description: '',
              },
            ],
            description: 'An extrinsic completed successfully.',
            index: 0,
          },
          {
            name: 'balances.InvalidResponderVersion',
            schema: [
              {
                type: 'unknown',
                originalType: '{"parents":"u8","interior":"XcmV3Junctions"}',
                name: 'originlocation',
                typeName: 'MultiLocation',
                description: '',
              },
              {
                type: 'number',
                example: expect.any(Number),
                originalType: 'u64',
                name: 'id',
                typeName: 'QueryId',
                description: '',
              },
            ],
            description:
              'Expected query response has been received but the expected origin location placed in storage by this runtime previously cannot be decoded. The query remains registered.  This is unexpected (since a location placed in storage in a previously executing runtime should be readable prior to query timeout) and dangerous since the possibly valid response will be dropped. Manual governance intervention is probably going to be needed.',
            index: 9,
          },
          {
            name: 'balances.Deposit',
            schema: [
              {
                type: 'string',
                example: expect.any(String),
                originalType: 'AccountId32',
                name: 'who',
                typeName: 'T::AccountId',
                description: '',
              },
              {
                type: 'number',
                example: expect.any(Number),
                originalType: 'u128',
                name: 'who',
                typeName: 'T::Balance',
                description: '',
              },
            ],
            description:
              'Some amount was deposited (e.g. for transaction fees).',
            index: 7,
          },
        ],
      });
    });
  });

  describe('parseEventsDef', () => {
    it('should return an empty array if given an empty object', () => {
      expect(service.parseEventsDef({})).toEqual([]);
    });

    it('should return an array of event definitions given a non-empty object', () => {
      expect(service.parseEventsDef(events)).toEqual([
        {
          name: 'system.ExtrinsicSuccess',
          schema: [
            {
              type: 'unknown',
              originalType:
                '{"weight":"SpWeightsWeightV2Weight","class":"FrameSupportDispatchDispatchClass","paysFee":"FrameSupportDispatchPays"}',
              name: 'dispatch_info',
              typeName: 'DispatchInfo',
              description: '',
            },
          ],
          description: 'An extrinsic completed successfully.',
          index: 0,
        },
        {
          name: 'balances.InvalidResponderVersion',
          schema: [
            {
              type: 'unknown',
              originalType: '{"parents":"u8","interior":"XcmV3Junctions"}',
              name: 'originlocation',
              typeName: 'MultiLocation',
              description: '',
            },
            {
              type: 'number',
              example: expect.any(Number),
              originalType: 'u64',
              name: 'id',
              typeName: 'QueryId',
              description: '',
            },
          ],
          description:
            'Expected query response has been received but the expected origin location placed in storage by this runtime previously cannot be decoded. The query remains registered.  This is unexpected (since a location placed in storage in a previously executing runtime should be readable prior to query timeout) and dangerous since the possibly valid response will be dropped. Manual governance intervention is probably going to be needed.',
          index: 9,
        },
        {
          name: 'balances.Deposit',
          schema: [
            {
              type: 'string',
              example: expect.any(String),
              originalType: 'AccountId32',
              name: 'who',
              typeName: 'T::AccountId',
              description: '',
            },
            {
              type: 'number',
              example: expect.any(Number),
              originalType: 'u128',
              name: 'who',
              typeName: 'T::Balance',
              description: '',
            },
          ],
          description: 'Some amount was deposited (e.g. for transaction fees).',
          index: 7,
        },
      ]);
    });
  });

  describe('isPrimitiveType', () => {
    it('should return true for primitive types', () => {
      expect(service.isPrimitiveType('string')).toBe(true);
      expect(service.isPrimitiveType('number')).toBe(true);
      expect(service.isPrimitiveType('boolean')).toBe(true);
    });

    it('should return false for non-primitive types', () => {
      expect(service.isPrimitiveType('unknown')).toBe(false);
      expect(service.isPrimitiveType('object')).toBe(false);
      expect(service.isPrimitiveType('function')).toBe(false);
    });
  });

  describe('parseFieldSchema', () => {
    it('should return the expected TypeSchema', () => {
      const field = {
        name: 'exampleName',
        typeName: 'Bool',
        docs: ['example description'],
      } as any as Si1Field;
      const arg = 'Bool';

      const result = service.parseFieldSchema(field, arg);

      expect(result).toEqual({
        type: GeneralTypeEnum.BOOL,
        name: 'exampleName',
        example: true,
        originalType: 'Bool',
        typeName: 'Bool',
        description: 'example description',
      });
    });
  });

  describe('parseArgType', () => {
    test('should return correct result for Bool argument', () => {
      const result = service.parseArgType('Bool');
      expect(result).toEqual({
        type: GeneralTypeEnum.BOOL,
        example: true,
        originalType: 'Bool',
      });
    });

    test('should return correct result for Str argument', () => {
      const result = service.parseArgType('Str');
      expect(result).toEqual({
        type: GeneralTypeEnum.STRING,
        example: 'This is an example',
        originalType: 'Str',
      });
    });

    test('should return correct result for integer number argument', () => {
      const result = service.parseArgType('i32');
      expect(result).toEqual({
        type: GeneralTypeEnum.NUMBER,
        example: expect.any(Number),
        originalType: 'i32',
      });
    });

    test('should return correct result for float number argument', () => {
      const result = service.parseArgType('u32');
      expect(result).toEqual({
        type: GeneralTypeEnum.NUMBER,
        example: expect.any(Number),
        originalType: 'u32',
      });
    });

    test('should return correct result for AccountId32 argument', () => {
      const result = service.parseArgType('AccountId32');
      expect(result).toEqual({
        type: GeneralTypeEnum.STRING,
        example: expect.any(String),
        originalType: 'AccountId32',
      });
    });

    test('should return correct result for H256 argument', () => {
      const result = service.parseArgType('H256');
      expect(result).toEqual({
        type: GeneralTypeEnum.STRING,
        example: expect.any(String),
        originalType: 'H256',
      });
    });

    test('should return correct result for unknown argument', () => {
      const result = service.parseArgType('UnknownType');
      expect(result).toEqual({
        type: GeneralTypeEnum.UNKNOWN,
        originalType: 'UnknownType',
      });
    });
  });

  describe('generateFloat', () => {
    it('returns a number for a valid argument', () => {
      const result = service.generateFloat('u8');
      expect(typeof result).toBe('number');
    });

    it('returns undefined for an invalid argument', () => {
      const result = service.generateFloat('invalid');
      expect(result).toBeUndefined();
    });

    it('returns a number greater than or equal to 0', () => {
      const result = service.generateFloat('u8');
      expect(result).toBeGreaterThanOrEqual(0);
    });

    it('returns a number greater than or equal to 0 and less than or equal to 100000 for u16, u32, u64, u128, and u256', () => {
      const mappings = ['u16', 'u32', 'u64', 'u128', 'u256'];
      mappings.forEach((mapping) => {
        const result = service.generateFloat(mapping);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(100000);
      });
    });
  });

  describe('generateInteger', () => {
    it('returns a number for i8', () => {
      const result = service.generateInteger('i8');
      expect(typeof result).toBe('number');
    });

    it('returns a number for i16', () => {
      const result = service.generateInteger('i16');
      expect(typeof result).toBe('number');
    });

    it('returns a number for i32', () => {
      const result = service.generateInteger('i32');
      expect(typeof result).toBe('number');
    });

    it('returns a number for i64', () => {
      const result = service.generateInteger('i64');
      expect(typeof result).toBe('number');
    });

    it('returns a number for i128', () => {
      const result = service.generateInteger('i128');
      expect(typeof result).toBe('number');
    });

    it('returns a number for i256', () => {
      const result = service.generateInteger('i256');
      expect(typeof result).toBe('number');
    });
  });

  describe('generateAddress', () => {
    it('should generate a non-empty address string', () => {
      const address = service.generateAddress();
      expect(typeof address).toBe('string');
      expect(address.length).toBeGreaterThan(0);
    });
  });
});
