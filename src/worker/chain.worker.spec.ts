import { Test, TestingModule } from '@nestjs/testing';
import { ChainWorker } from './chain.worker';
import { WorkflowService } from '../workflow/workflow.service';
import { ChainService } from '../chain/chain.service';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { ChainEntity } from '../chain/chain.entity';
import { Repository } from 'typeorm';
import { Queue } from 'bull';
import { Logger } from '@nestjs/common';
import * as Bull from '@nestjs/bull';
import {
  mockChainEntity,
  mockChainSummary,
  mockEventEntity,
  mockUserEntity,
  mockWorkflowEntity,
} from '../../test/mock-data.util';

describe('ChainWorker', () => {
  let worker: ChainWorker;
  let workflowService: WorkflowService;
  let chainService: ChainService;
  let chainRepository: Repository<ChainEntity>;
  const chainQueue = {
    add: jest.fn(),
    process: jest.fn(),
    on: jest.fn(),
    getJobCounts: jest.fn(),
  };

  const mockedChainEntity = mockChainEntity();
  const mockedWorkflowEntity = mockWorkflowEntity(
    mockUserEntity(),
    mockEventEntity(mockedChainEntity.uuid),
    mockedChainEntity,
  );

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChainWorker,
        WorkflowService,
        ChainService,

        {
          provide: ChainService,
          useValue: {
            getChainsByEventIds: jest.fn(),
          },
        },
        { provide: Bull.getQueueToken('chain'), useValue: chainQueue },
        {
          provide: getRepositoryToken(ChainEntity),
          useClass: Repository,
        },
        {
          provide: WorkflowService,
          useValue: {
            getRunningWorkflows: jest.fn(),
          },
        },
      ],
    }).compile();

    worker = module.get<ChainWorker>(ChainWorker);
    workflowService = module.get<WorkflowService>(WorkflowService);
    chainService = module.get<ChainService>(ChainService);
    chainRepository = module.get<Repository<ChainEntity>>(
      getRepositoryToken(ChainEntity),
    );
  });

  describe('startChainWorkers', () => {
    const chains = [
      {
        chainId: mockedWorkflowEntity.chain.chainId,
        config: mockedWorkflowEntity.chain.config,
      },
    ];

    it('should add chains to the chain queue', async () => {
      const mockAdd = jest
        .spyOn(chainQueue, 'add')
        .mockResolvedValue(undefined);
      const mockGetJobCounts = jest
        .spyOn(chainQueue, 'getJobCounts')
        .mockResolvedValue(chains.length);

      await worker.startChainWorkers(chains);
      expect(mockAdd).toHaveBeenCalledWith(chains, expect.any(Object));
      expect(mockGetJobCounts).toHaveBeenCalled();
    });
  });
});
