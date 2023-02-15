import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bull';
import { find, isEmpty, map, pick, reduce, uniq } from 'lodash';
import { BlockJobData } from '../common/queue.type';
import { Event } from '../event/event.entity';
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
    const eventNames = uniq(map(data.events, (e) => `${e.pallet}.${e.name}`));
    this.logger.debug(`Events: ${eventNames.join(' | ')}`);
    const events = await this.eventService.getEventsByChainUuidAndName(
      data.chainUuid,
      eventNames,
    );

    if (isEmpty(events)) {
      this.logger.debug(`Not found events: ${eventNames.join(', ')}`);
      return;
    }

    const workflowVersionAndTriggerTasks =
      await this.workflowService.getRunningWorkflowVersionAndTriggerEvents(
        map(events, 'id'),
      );

    if (isEmpty(workflowVersionAndTriggerTasks)) {
      this.logger.debug(`Not found running workflows`);
      return true;
    }

    const jobOption = {
      removeOnComplete: true,
      removeOnFail: true,
    };

    const eventIdToEventData = {};
    const jobs = workflowVersionAndTriggerTasks.map(
      ({ workflowVersionId, eventId }) => {
        const result = {
          data: {
            workflowVersionId,
            ...eventIdToEventData[eventId],
          },
          opts: {
            ...jobOption,
            jobId: `${workflowVersionId}_${eventId}_${data.hash}`,
          },
        };

        if (eventIdToEventData[eventId]) {
          return result;
        }

        const event: Event = events.find((e) => e.id === eventId);
        const eventData = find(
          data.events,
          (e) => e.name === event.name && e.pallet === event.pallet,
        );

        eventData.data = reduce(
          eventData.data,
          (result, value, index) => {
            const field = event.dataSchema[index];
            result[field.name] = formatValue(field.typeName, value);
            return result;
          },
          {},
        );
        eventData.block = {
          hash: data.hash,
        };

        eventIdToEventData[eventId] = {
          eventData: {
            ...eventData,
            ...pick(data, ['timestamp', 'success']),
          },
          event,
        };

        result.data = { ...result.data, ...eventIdToEventData[eventId] };
        return result;
      },
    );

    await this.workflowQueue.addBulk(jobs);
    this.logger.debug(
      `Found running workflows, ${JSON.stringify(
        workflowVersionAndTriggerTasks.map(
          (i) => `${i.eventId} | ${i.workflowVersionId}`,
        ),
      )}`,
    );
  }
}
