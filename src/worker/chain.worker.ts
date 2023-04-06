import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Cron } from '@nestjs/schedule';
import { WorkflowService } from '../workflow/workflow.service';
import { isEmpty, map, uniq } from 'lodash';
import { ChainEntity } from '../chain/chain.entity';
import { ChainService } from '../chain/chain.service';
import { AppEvent } from '../common/app-event.type copy';

@Injectable()
export class ChainWorker implements OnModuleInit {
  private readonly logger = new Logger(ChainWorker.name);

  constructor(
    @InjectQueue('chain') private chainQueue: Queue,
    private readonly workflowService: WorkflowService,
    private readonly chainService: ChainService,
  ) {}

  async onModuleInit() {
    await this.monitorRunningWorkflows();
  }

  @Cron('* * * * *', {
    name: AppEvent.WORKFLOW_MONITOR,
  })
  async monitorRunningWorkflows() {
    this.logger.debug('Checking running workflows to start chain worker');
    const runningWorkflows = await this.workflowService.getRunningWorkflows();

    if (!isEmpty(runningWorkflows)) {
      const eventIds = uniq(map(runningWorkflows, 'eventId'));
      const chains = await this.chainService.getChainsByEventIds(eventIds);
      await this.startChainWorkers(chains);
    }
  }

  async startChainWorkers(chains: Partial<ChainEntity>[]) {
    const jobOption = {
      removeOnComplete: true,
      removeOnFail: true,
    };
    await this.chainQueue.add(chains, jobOption);
    console.log({ chains });

    this.logger.debug(
      `Start worker for chain ${map(chains, 'chainId').join(', ')}`,
      await this.chainQueue.getJobCounts(),
    );
  }
}
