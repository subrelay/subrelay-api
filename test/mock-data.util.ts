import { ulid } from 'ulid';
import {
  Workflow,
  WorkflowLogSummary,
  WorkflowStatus,
} from '../src/workflow/workflow.type';
import { UserEntity } from '../src/user/user.entity';
import { EventEntity } from '../src/event/event.entity';
import { GeneralTypeEnum } from '../src/substrate/substrate.type';
import { ChainSummary } from '../src/chain/chain.dto';

import * as block from './sample/block.json';
import { ChainEntity } from '../src/chain/chain.entity';
import { TaskEntity } from '../src/task/entity/task.entity';
import { TaskStatus, TaskType } from '../src/task/type/task.type';
import { UserSummary } from '../src/user/user.dto';
import { TaskLogEntity } from '../src/task/entity/task-log.entity';
import { WorkflowLogEntity } from '../src/workflow/entity/workflow-log.entity';
import { Event } from '../src/event/event.type';

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

export function mockUserSummary(): UserSummary {
  return userEntity;
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

export function mockTriggerTask(eventId, workflowId): TaskEntity {
  return {
    id: ulid(),
    type: TaskType.TRIGGER,
    name: 'trigger',
    dependOn: null,
    config: {
      eventId,
    },
    workflowId,
  };
}

export function mockFilterTask(workflowId, dependOn): TaskEntity {
  return {
    id: ulid(),
    type: TaskType.FILTER,
    name: 'filter',
    dependOn,
    config: {
      conditions: [
        [
          {
            value: 1,
            operator: 'greaterThan',
            variable: 'event.data.amount',
          },
        ],
      ],
    },
    workflowId,
  };
}

export function mockWebhookTask(workflowId, dependOn): TaskEntity {
  return {
    id: ulid(),
    type: TaskType.WEBHOOK,
    name: 'webhook',
    dependOn,
    config: {
      secret: null,
      encrypted: false,
      url: 'https://webhook.site/b8d1f60c-959e-41e3-a138-cf672d68c633',
    },
    workflowId,
  };
}

export function mockWorkflowEntity(
  defaultUser: UserEntity = null,
  defaultEvent: EventEntity = null,
  defaultChain: ChainEntity = null,
) {
  const id = ulid();
  const user = defaultUser || mockUserEntity();
  const chain = defaultChain || mockChainEntity();
  const event = defaultEvent || mockEventEntity(chain.uuid);
  const trigger = mockTriggerTask(event.id, id);
  return {
    id,
    name: 'Dot webhook',
    createdAt: new Date('2023-06-19T02:37:30.588Z'),
    updatedAt: new Date('2023-06-19T09:37:30.590Z'),
    status: WorkflowStatus.RUNNING,
    userId: user.id,
    chain,
    event: event,
    eventId: event.id,
    user,
    tasks: [trigger, mockWebhookTask(id, trigger.id)] as TaskEntity[],
  };
}

export function mockBlockJobData() {
  return block;
}

export function mockTaskLogEntity(task: TaskEntity): TaskLogEntity {
  return {
    id: ulid(),
    startedAt: new Date(),
    finishedAt: new Date(),
    status: TaskStatus.SUCCESS,
    workflowLogId: task.workflowId,
    task,
    taskId: task.id,
    output: null,
    input: null,
    error: null,
  };
}

export function mockWorkflowLogSummary(workflow: Workflow): WorkflowLogSummary {
  return {
    id: ulid(),
    startedAt: new Date(),
    finishedAt: new Date(),
    status: TaskStatus.SUCCESS,
    input: {},
    chain: {
      name: workflow.chain.name,
      uuid: workflow.chain.uuid,
      imageUrl: workflow.chain.imageUrl,
    },
    workflow: {
      id: workflow.id,
      name: workflow.name,
    },
  };
}

export function mockEvent(): Event {
  const chain = mockChainSummary();
  const eventEntity = mockEventEntity(chain.uuid);
  return {
    id: eventEntity.id,
    name: eventEntity.name,
    chain,
    schema: eventEntity.schema,
    description: eventEntity.description,
  };
}
