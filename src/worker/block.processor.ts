import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bull';
import { find, isEmpty, map, reduce, uniq } from 'lodash';
import { BlockJobData, EventRawData } from '../common/queue.type';
import { EventService } from '../event/event.service';
import { formatValue } from '../substrate/type.util';
import { WorkflowService } from '../workflow/workflow.service';
import { createProcessWorkflowInput } from '../workflow/workflow.type';
import { UserService } from '../user/user.service';
import { ChainService } from '../chain/chain.service';

@Processor('block')
export class BlockProcessor {
  private readonly logger = new Logger(BlockProcessor.name);
  constructor(
    @InjectQueue('workflow') private workflowQueue: Queue,
    private readonly workflowService: WorkflowService,
    private readonly eventService: EventService,
    private readonly userService: UserService,
    private readonly chainService: ChainService,
  ) {}

  @Process({ concurrency: 10 })
  async processNewBlock(job: Job) {
    const data: BlockJobData = job.data;

    const eventNames = uniq(map(data.events, 'name'));
    this.logger.debug(`Events: ${eventNames.join(' | ')}`);

    const events = await this.eventService.getEventsByChainIdAndName(
      data.chainId,
      eventNames,
    );

    if (isEmpty(events)) {
      this.logger.debug(`Not found events: ${eventNames.join(', ')}`);
      return;
    }

    const runningWorkflows =
      await this.workflowService.getRunningWorkflowsByEventIds(
        map(events, 'id'),
      );

    if (isEmpty(runningWorkflows)) {
      this.logger.debug(`Not found running workflows match with events`);
      return true;
    }

    const users = await this.userService.getUserByIds(
      map(runningWorkflows, 'userId'),
    );

    const jobOption = {
      removeOnComplete: true,
      removeOnFail: true,
    };

    const chain = await this.chainService.getChainByChainId(data.chainId);

    const jobs = runningWorkflows.map((workflow) => {
      const blockEvent = find(
        data.events,
        (e) => e.name === workflow.event.name,
      );
      const eventInfo = find(events, { id: workflow.event.id });

      const blockEventData = reduce(
        blockEvent.data,
        (result, value, index) => {
          const field = eventInfo.schema[index];
          result[field.name] = formatValue(field.typeName, value, chain.config.chainDecimals[0]);
          return result;
        },
        {},
      );

      const eventRawData: EventRawData = {
        timestamp: data.timestamp,
        success: data.success,
        block: {
          hash: data.hash,
        },
        data: blockEventData,
      };

      const user = find(users, { id: workflow.userId });

      return {
        data: createProcessWorkflowInput(workflow, eventRawData, user),
        opts: {
          ...jobOption,
          jobId: `${workflow.id}_${data.hash}`,
        },
      };
    });

    await this.workflowQueue.addBulk(jobs);
    this.logger.debug(
      `Found running workflows, ${JSON.stringify(
        runningWorkflows.map((i) => `${i.id} | ${i.event.name}`),
      )}`,
    );
  }
}
