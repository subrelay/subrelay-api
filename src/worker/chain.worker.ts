import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { isEmpty, map, uniq } from 'lodash';
import { ChainEntity } from '../chain/chain.entity';
import { AppEvent } from '../common/app-event.type';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class ChainWorker {
  private readonly logger = new Logger(ChainWorker.name);

  constructor(@InjectQueue('chain') private chainQueue: Queue) {}

  @OnEvent(AppEvent.WORKFLOW_CREATED)
  async startChainWorkers(chains: Partial<ChainEntity>[]) {
    this.logger.debug(
      `Start worker for chain ${map(chains, 'chainId').join(', ')}.`,
    );

    const jobOption = {
      removeOnComplete: true,
      removeOnFail: true,
    };
    await this.chainQueue.add(chains, jobOption);

    this.logger.debug(
      `Added chains to chain queue.`,
      await this.chainQueue.getJobCounts(),
    );
  }
}
