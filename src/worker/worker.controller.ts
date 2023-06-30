import { Controller, Get } from '@nestjs/common';

import { isEmpty, uniqBy } from 'lodash';
import { ChainService } from '../chain/chain.service';
import { WorkflowService } from '../workflow/workflow.service';

@Controller('workers')
export class WorkerController {
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly chainService: ChainService,
  ) {}

  @Get()
  async getWorkers(): Promise<{ chainId: string; rpc: string }[]> {
    // TODO verify request from event service
    const runningWorkflows = await this.workflowService.getRunningWorkflows();

    if (!isEmpty(runningWorkflows)) {
      const chains = await this.chainService.getChainsByEventIds(
        runningWorkflows.map((wf) => wf.event.id),
      );

      const uniqChains = uniqBy(chains, 'chainId').map((c) => ({
        chainId: c.chainId,
        rpc: c.config.rpcs[0],
      }));

      return uniqChains;
    }

    return [];
  }
}
