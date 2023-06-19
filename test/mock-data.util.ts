import { ulid } from 'ulid';
import { WorkflowStatus } from '../src/workflow/workflow.type';
import { UserEntity } from '../src/user/user.entity';
import { EventEntity } from '../src/event/event.entity';
import { GeneralTypeEnum } from '../src/substrate/substrate.type';
import { ChainSummary } from '../src/chain/chain.dto';

import * as block from './sample/block.json';
import { ChainEntity } from '../src/chain/chain.entity';

const mockedEventSummary = {
  id: '01H2QCFESN1HQD9C2WZ2G3XNCF',
  name: 'balances.Deposit',
  description: 'Some amount was deposited (e.g. for transaction fees).',
};

export const mockedChainSummary: ChainSummary = {
  name: '01H2S828695SQJ8PV131Y45RA7',
  uuid: '01H2QCFESCHJAHDJV1BRFKE2PQ',
  chainId: 'kusama',
  imageUrl:
    'https://01H2S82869WS23KJ6CF8PGKXRP.com/01H2S828691ZCXQAHVG9TAKMKC.png',
  createdAt: '2023-06-12T01:45:05.201Z',
  version: '9420',
};

const userEntity = {
  id: ulid(),
  address: '5Ea3dne7kDTMvSnYCFTFrZsLNputsrg35ZQCaHwuviSYMa3e',
  createdAt: new Date('2023-06-19T02:37:30.588Z'),
};

export function mockDiscordUser() {
  return {
    id: 'discordId',
    username: 'Discord user',
    avatar: 'https://example.com/file_1.jpg',
  };
}

export function mockTelegramUser() {
  return {
    id: 'telegramId',
    username: 'Telegram user',
    avatar: 'https://example.com/file_1.jpg',
  };
}

export function mockUserEntity(): UserEntity {
  return {
    id: ulid(),
    address: '5Ea3dne7kDTMvSnYCFTFrZsLNputsrg35ZQCaHwuviSYMa3e',
    createdAt: new Date('2023-06-19T02:37:30.588Z'),
  };
}

export function mockEventEntity(chainUuid: string): EventEntity {
  return {
    ...mockedEventSummary,
    chainUuid: chainUuid,
    index: 7,
    schema: [
      {
        name: 'who',
        type: GeneralTypeEnum.STRING,
        example: '2UbGKDKa9Au5h3qYPsiKYFazNGWViMn38yBw',
        typeName: 'T::AccountId',
        description: '',
        originalType: 'AccountId32',
      },
      {
        name: 'amount',
        type: GeneralTypeEnum.NUMBER,
        example: 44000,
        typeName: 'T::Balance',
        description: '',
        originalType: 'u128',
      },
    ],
  };
}

export function mockChainSummary() {
  return mockedChainSummary;
}

export function mockChainEntity() {
  return {
    ...mockedChainSummary,
    config: {
      rpcs: ['wss://kusama-rpc.polkadot.io', 'wss://polkadot-rpc.polkadot.io'],
      chainTokens: ['KSM'],
      chainDecimals: [12],
      metadataVersion: 14,
    },
    events: [mockEventEntity(mockedChainSummary.uuid)],
  };
}

export function mockWorkflowEntity(
  user: UserEntity,
  event: EventEntity,
  chain: ChainEntity,
) {
  return {
    id: ulid(),
    name: 'Dot webhook',
    createdAt: new Date('2023-06-19T02:37:30.588Z'),
    updatedAt: new Date('2023-06-19T09:37:30.590Z'),
    status: WorkflowStatus.RUNNING,
    userId: user.id,
    chain,
    event: event,
    eventId: event.id,
    user,
    tasks: [
      {
        id: '01H39G8FGBF8ZWX9D31CF4MDDY',
        type: 'trigger',
        name: 'trigger',
        dependOn: null,
        config: {
          eventId: mockedEventSummary.id,
        },
        workflowId: '01H39G8FEXCKD3AVZDEN6GA85W',
      },
      {
        id: '01H39G8FGPX10SXFY2WAGV6WHH',
        type: 'webhook',
        name: 'action',
        dependOn: '01H39G8FGBF8ZWX9D31CF4MDDY',
        config: {
          secret: null,
          encrypted: false,
          url: 'https://webhook.site/b8d1f60c-959e-41e3-a138-cf672d68c633',
        },
        workflowId: '01H39G8FEXCKD3AVZDEN6GA85W',
      },
    ],
  };
}

export function mockBlockJobData() {
  return block;
}
