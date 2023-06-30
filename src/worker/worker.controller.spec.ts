import { Test, TestingModule } from '@nestjs/testing';
import { WorkerController } from './worker.controller';
import { WorkflowService } from '../workflow/workflow.service';
import { ChainService } from '../chain/chain.service';
import { ChainConfig } from '../chain/chain.entity';
import { mockChainEntity, mockWorkflowEntity } from '../../test/mock-data.util';

describe('WorkerController', () => {
  let controller: WorkerController;
  let workflowService: WorkflowService;
  let chainService: ChainService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkerController],
      providers: [
        {
          provide: WorkflowService,
          useValue: {
            getRunningWorkflows: jest.fn(),
          },
        },
        {
          provide: ChainService,
          useValue: {
            getChainsByEventIds: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<WorkerController>(WorkerController);
    workflowService = module.get<WorkflowService>(WorkflowService);
    chainService = module.get<ChainService>(ChainService);
  });

  describe('getWorkers', () => {
    const chain = mockChainEntity();

    it('should return an array of unique chains', async () => {
      const workflow = mockWorkflowEntity();
      const runningWorkflows = [workflow];
      const chains: { chainId: string; config: ChainConfig }[] = [
        { chainId: 'chain1', config: { ...chain.config, rpcs: ['rpc1'] } },
        { chainId: 'chain2', config: { ...chain.config, rpcs: ['rpc2'] } },
        { chainId: 'chain1', config: { ...chain.config, rpcs: ['rpc1'] } },
      ];

      jest
        .spyOn(workflowService, 'getRunningWorkflows')
        .mockResolvedValue(runningWorkflows);
      jest.spyOn(chainService, 'getChainsByEventIds').mockResolvedValue(chains);

      const result = await controller.getWorkers();

      expect(result).toEqual([
        { chainId: 'chain1', rpc: 'rpc1' },
        { chainId: 'chain2', rpc: 'rpc2' },
      ]);
    });

    it('should return an empty array if there are no running workflows', async () => {
      jest.spyOn(workflowService, 'getRunningWorkflows').mockResolvedValue([]);

      const result = await controller.getWorkers();

      expect(result).toEqual([]);
    });
  });
});
