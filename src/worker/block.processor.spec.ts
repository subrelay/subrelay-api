import * as Bull from '@nestjs/bull';
import { Test, TestingModule } from '@nestjs/testing';
import { BlockJobData, EventRawData } from '../common/queue.type';
import { EventService } from '../event/event.service';
import { WorkflowService } from '../workflow/workflow.service';
import { createProcessWorkflowInput } from '../workflow/workflow.type';
import { UserService } from '../user/user.service';
import { BlockProcessor } from './block.processor';
import {
  mockBlockJobData,
  mockChainEntity,
  mockEventEntity,
  mockUserEntity,
  mockWorkflowEntity,
} from '../../test/mock-data.util';

import { Job } from 'bull';

describe('BlockProcessor', () => {
  let blockProcessor: BlockProcessor;
  let eventService: EventService;
  let workflowService: WorkflowService;
  let userService: UserService;
  const blockQueue = {
    add: jest.fn(),
    process: jest.fn(),
    on: jest.fn(),
    getJobCounts: jest.fn(),
    addBulk: jest.fn(),
  };

  const workflowQueue = {
    add: jest.fn(),
    process: jest.fn(),
    on: jest.fn(),
    getJobCounts: jest.fn(),
    addBulk: jest.fn(),
  };

  let blockJobData;
  const user = mockUserEntity();
  const mockedChainEntity = mockChainEntity();
  const mockedEventEntity = mockEventEntity(mockedChainEntity.uuid);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlockProcessor,
        {
          provide: EventService,
          useValue: {
            getEventsByChainIdAndName: jest.fn(),
          },
        },
        { provide: Bull.getQueueToken('block'), useValue: blockQueue },
        { provide: Bull.getQueueToken('workflow'), useValue: workflowQueue },
        {
          provide: WorkflowService,
          useValue: {
            getRunningWorkflowsByEventIds: jest.fn(),
          },
        },
        {
          provide: UserService,
          useValue: {
            getUserByIds: jest.fn(),
          },
        },
      ],
    }).compile();

    blockProcessor = module.get<BlockProcessor>(BlockProcessor);
    eventService = module.get<EventService>(EventService);
    workflowService = module.get<WorkflowService>(WorkflowService);
    userService = module.get<UserService>(UserService);
  });

  describe('processNewBlock', () => {
    beforeEach(() => {
      blockJobData = {
        ...mockBlockJobData(),
        userId: user.id,
        user,
      };
    });

    it('should not process block if no events found', async () => {
      const job = { data: { ...blockJobData } } as any as Job;
      job.data.events = [];
      const result = await blockProcessor.processNewBlock(job);
      expect(result).toBeUndefined();
    });

    it('should not process block if no running workflows found', async () => {
      const job = { data: blockJobData } as any as Job;

      jest
        .spyOn(eventService, 'getEventsByChainIdAndName')
        .mockResolvedValueOnce([mockedEventEntity]);
      jest
        .spyOn(workflowService, 'getRunningWorkflowsByEventIds')
        .mockResolvedValueOnce([]);
      const result = await blockProcessor.processNewBlock(job);

      expect(result).toBe(true);
      expect(userService.getUserByIds).not.toHaveBeenCalled();
    });

    it('should process block and add jobs to the workflow queue', async () => {
      const job = { data: blockJobData } as any as Job;
      const mockedWorkflowEntity = mockWorkflowEntity(
        user,
        mockedEventEntity,
        mockedChainEntity,
      );

      jest
        .spyOn(eventService, 'getEventsByChainIdAndName')
        .mockResolvedValueOnce([mockedWorkflowEntity.event]);
      jest
        .spyOn(workflowService, 'getRunningWorkflowsByEventIds')
        .mockResolvedValueOnce([mockedWorkflowEntity]);

      jest
        .spyOn(userService, 'getUserByIds')
        .mockResolvedValueOnce([mockedWorkflowEntity.user]);

      const addBulkSpy = jest
        .spyOn(workflowQueue, 'addBulk')
        .mockResolvedValueOnce(undefined);

      const result = await blockProcessor.processNewBlock(job);
      expect(addBulkSpy).toHaveBeenCalledWith([
        {
          data: {
            event: {
              id: '01H2QCFESN1HQD9C2WZ2G3XNCF',
              name: 'balances.Deposit',
              description:
                'Some amount was deposited (e.g. for transaction fees).',
              timestamp: 1687171620000,
              success: true,
              block: {
                hash: '0x84a4f2358de444980abbb09d9ffa08d90518effbb0e09d326368f019299cc83c',
              },
              data: {
                who: 'F3opxRbN5ZbjJNU511Kj2TLuzFcDq9BGduA9TgiECafpg29',
                amount: '0.0422',
              },
              time: new Date('2023-06-19T10:47:00.000Z'),
            },
            workflow: {
              id: mockedWorkflowEntity.id,
              name: mockedWorkflowEntity.name,
            },
            chain: {
              uuid: mockedWorkflowEntity.chain.uuid,
              name: mockedWorkflowEntity.chain.name,
            },
            user: mockedWorkflowEntity.user,
          },
          opts: {
            removeOnComplete: true,
            removeOnFail: true,
            jobId: `${mockedWorkflowEntity.id}_${blockJobData.hash}`,
          },
        },
      ]);
      expect(result).toBeUndefined();
    });
  });
});
