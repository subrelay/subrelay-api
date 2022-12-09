import { Injectable, OnModuleInit } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SchedulerRegistry } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { CronJob } from 'cron';
import { find, get, map, zip } from 'lodash';
import { Chain } from 'src/chain/chain.entity';
import { ChainService } from 'src/chain/chain.service';
import { AppEvent, getBlockWatcherJobName } from 'src/common/app-event.type';
import { EventService } from 'src/event/event.service';
import { TaskService } from 'src/task/task.service';
import { WorkflowService } from 'src/workflow/workflow.service';
import { Repository } from 'typeorm';
import { EventData } from './event-data.entity';
import { EventRawData } from './event-data.type';

@Injectable()
export class EventDataService implements OnModuleInit {
  constructor(
    @InjectRepository(EventData)
    private eventDataRepository: Repository<EventData>,

    private readonly chainService: ChainService,
    private readonly taskService: TaskService,
    private readonly eventService: EventService,
    private readonly workflowService: WorkflowService,
    private schedulerRegistry: SchedulerRegistry,
  ) {}

  onModuleInit() {
    this.startBlockWatchers();
  }

  async startBlockWatchers() {
    const runningWorkflows = await this.workflowService.getRunningWorkflows();

    if (runningWorkflows.length > 0) {
      const chains = map(runningWorkflows, 'chain');
      console.log({ chains });

      const cron = '0 0 1 1 *'; // every year
      chains.forEach((chain) => {
        const jobName = getBlockWatcherJobName(chain);
        const job = new CronJob(cron, () => this.startBlockWatcher(chain));

        this.schedulerRegistry.addCronJob(jobName, job);
        job.start();

        console.log(`Start watching chain ${chain.chainId}`);
      });
    }
  }

  async startBlockWatcher(chain: Chain) {
    console.info(`Start watch chain ${chain.chainId}`);
  }

  @OnEvent(AppEvent.JOB_STOP)
  stopJob(jobName: string) {
    const job = this.schedulerRegistry.getCronJob(jobName);

    job && job.stop();
  }

  @OnEvent(AppEvent.EVENT_PROCESS)
  async processEventData(data: EventRawData) {
    const events = await this.eventService.getEventsByChain(data.chainUuid);
    const eventDataInput = data.records.map((record) => {
      const event = events.find(
        (e) =>
          e.pallet === record.event.section && e.name === record.event.method,
      );

      if (!event) {
        throw new Error(
          `Event not found in chain ${data.chainUuid}: ${JSON.stringify(
            record,
          )}`,
        );
      }
      return {
        eventId: event.id,
        data: zip(Object.keys(event.dataSchema.properties), record.event.data),
        success: data.success,
        hash: data.hash,
        timestamp: data.timestamp,
      };
    });

    const triggerTasks = await this.taskService.getTriggerTasks(
      data.chainUuid,
      map(eventDataInput, 'eventId'),
    );

    if (triggerTasks.length > 0) {
      // process workflow
    }
  }
}
