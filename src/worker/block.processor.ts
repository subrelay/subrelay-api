import { Injectable, Logger } from '@nestjs/common';
import { find, isEmpty, map, reduce, uniq } from 'lodash';
import { BlockJobData, EventRawData } from '../common/queue.type';
import { EventService } from '../event/event.service';
import { formatValue } from '../substrate/type.util';
import { WorkflowService } from '../workflow/workflow.service';
import { createProcessWorkflowInput } from '../workflow/workflow.type';
import { UserService } from '../user/user.service';
import { ChainService } from '../chain/chain.service';
import { BLOCK_QUEUE, WORKFLOW_QUEUE } from './queue.constants';
import {
  QueueConsumerEventHandler,
  QueueMessageHandler,
  QueueService,
} from '@subrelay/nestjs-queue';

@Injectable()
export class BlockProcessor {
  private readonly logger = new Logger(BlockProcessor.name);
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly eventService: EventService,
    private readonly userService: UserService,
    private readonly chainService: ChainService,
    private readonly queueService: QueueService,
  ) {}

  @QueueMessageHandler('block')
  async processNewBlock({ id: jobId, body }: any) {
    this.logger.debug(
      `[${this.queueService.getConsumerQueueType(
        BLOCK_QUEUE,
      )}] Process job: ${jobId}`,
    );

    const [chainId, version, hash] = jobId.split('_');

    const eventNames = uniq(map(body.events, 'name'));
    this.logger.debug(`Chain: ${chainId}, Events: ${eventNames.join(' | ')}`);

    const events = await this.eventService.getEventsByChainIdAndName(
      chainId,
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

    const chain = await this.chainService.getChainByChainId(chainId);

    const jobs = runningWorkflows.map((workflow) => {
      const blockEvent = find(
        body.events,
        (e) => e.name === workflow.event.name,
      );
      const eventInfo = find(events, { id: workflow.event.id });

      const blockEventData = reduce(
        blockEvent.data,
        (result, value, index) => {
          const field = eventInfo.schema[index];
          result[field.name] = formatValue(
            field.typeName,
            value,
            chain.config.chainDecimals[0],
          );
          return result;
        },
        {},
      );

      const eventRawData: EventRawData = {
        timestamp: body.timestamp,
        success: body.success,
        block: {
          hash: body.hash,
        },
        data: blockEventData,
      };

      const user = find(users, { id: workflow.userId });

      return {
        body: createProcessWorkflowInput(workflow, eventRawData, user),
        id: `${workflow.id}_${body.hash}`,
      };
    });

    await this.queueService.send(WORKFLOW_QUEUE, jobs);
    this.logger.debug(
      `Found running workflows, ${JSON.stringify(
        runningWorkflows.map((i) => `${i.id} | ${i.event.name}`),
      )}`,
    );
  }
}
