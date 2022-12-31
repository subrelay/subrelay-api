import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bull';
import { find, isEmpty, map, pick, uniq } from 'lodash';
import { BlockJobData } from 'src/common/queue.type';
import { EventService } from 'src/event/event.service';
import { TaskService } from 'src/task/task.service';
import { TriggerTaskConfig } from 'src/task/type/trigger.type';
import { WorkflowService } from './workflow.service';

@Processor('block')
export class BlockProcessor {
  private readonly logger = new Logger(BlockProcessor.name);
  constructor(
    @InjectQueue('workflow') private workflowQueue: Queue,
    private readonly workflowService: WorkflowService,
    private readonly eventService: EventService,
    private readonly taskService: TaskService,
  ) {}

  @Process({ concurrency: 10 })
  async processNewBlock(job: Job) {
    const data: BlockJobData = job.data;
    const eventNames = uniq(map(data.events, (e) => `${e.pallet}.${e.name}`));
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

    if (!isEmpty(workflowVersionAndTriggerTasks)) {
      await this.workflowQueue.addBulk(
        workflowVersionAndTriggerTasks.map(({ workflowVersionId, eventId }) => {
          const event = find(events, {
            id: eventId,
          });

          const eventData = data.events.find(
            (e) => e.name === event.name && e.pallet === event.pallet,
          );

          return {
            data: {
              workflowVersionId,
              eventData: {
                ...eventData,
                ...pick(data, ['timestamp', 'success']),
                block: {
                  hash: data.hash,
                },
              },
              event,
            },
            opts: {
              removeOnComplete: true,
              removeOnFail: true,
            },
          };
        }),
      );
    }
  }
}
