import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bull';
import { find, isEmpty, map, reduce, uniq } from 'lodash';
import { BlockJobData, EventRawData } from '../common/queue.type';
import { EventService } from '../event/event.service';
import { formatValue } from '../substrate/type.util';
import { WorkflowService } from './workflow.service';

@Processor('block')
export class BlockProcessor {
  private readonly logger = new Logger(BlockProcessor.name);
  constructor(
    @InjectQueue('workflow') private workflowQueue: Queue,
    private readonly workflowService: WorkflowService,
    private readonly eventService: EventService,
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
      this.logger.debug(`Not found running workflows`);
      return true;
    }

    const jobOption = {
      removeOnComplete: true,
      removeOnFail: true,
    };

    const jobs = runningWorkflows.map((workflow) => {
      const blockEvent = find(
        data.events,
        (e) => e.name === workflow.event.name,
      );
      const blockEventData = reduce(
        blockEvent.data,
        (result, value, index) => {
          const field = workflow.event.schema[index];
          result[field.name] = formatValue(field.typeName, value);
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

      return {
        data: {
          workflow,
          eventRawData,
        },
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
