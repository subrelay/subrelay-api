import { Injectable, Logger } from '@nestjs/common';
import {
  NotificationChannel,
  NotificationTaskConfig,
} from 'src/task/type/notification.type';
import { get, isEmpty, keyBy, mapValues } from 'lodash';
import { ProcessStatus, TaskOutput, TaskType } from './type/task.type';
import { HttpService } from '@nestjs/axios';
import { FilterOperator, TriggerTaskConfig } from './type/trigger.type';
import { GeneralTypeEnum } from 'src/substrate/substrate.data';
import { Task } from './entity/task.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskLog } from './entity/task-log.entity';
import { ProcessTaskData, TaskInput } from './task.dto';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,

    @InjectRepository(TaskLog)
    private taskLogRepository: Repository<TaskLog>,

    private readonly httpService: HttpService,
  ) {}

  async createTask(input: Partial<Task>): Promise<number> {
    const result = await this.taskRepository.save(input);
    return result.id;
  }

  async createTaskLogs(input: Partial<TaskLog>[]) {
    return await this.taskLogRepository.save(input);
  }

  async updateTaskLogStatus(id: number, status: ProcessStatus) {
    return await this.taskLogRepository.update(
      { id },
      { status, startedAt: new Date() },
    );
  }

  async finishTaskLog(id: number, data: Pick<TaskLog, 'status' | 'output'>) {
    await this.taskLogRepository.update(
      { id },
      { ...data, finishedAt: new Date() },
    );
  }

  async skipPendingTaskLogs(workflowLogId: number) {
    await this.taskLogRepository.update(
      { workflowLogId, status: ProcessStatus.PENDING },
      { status: ProcessStatus.SKIPPED, finishedAt: new Date() },
    );
  }

  getTasks(workflowVersionId: number) {
    return this.taskRepository.find({
      where: { workflowVersionId },
      order: { dependOn: { direction: 'ASC', nulls: 'FIRST' } },
    });
  }

  async processTask(
    task: TaskInput,
    data: ProcessTaskData,
  ): Promise<TaskOutput> {
    if (task.type === TaskType.NOTIFICATION) {
      return await this.processNotificationTask(task, data);
    }

    if (task.type === TaskType.TRIGGER) {
      return await this.processTriggerTask(task, data);
    }

    return {
      success: false,
      error: {
        message: 'Invalid task type',
      },
    };
  }

  getTriggerTasks(workflowVersionIds: number[], eventIds: number[]) {
    return this.taskRepository
      .createQueryBuilder('t')
      .where({ type: TaskType.TRIGGER })
      .andWhereInIds(workflowVersionIds)
      .andWhere(`config ->> 'eventId' IN (:eventIds)`, eventIds)
      .getMany();
  }

  getOperatorMapping(): {
    [key: string]: FilterOperator[];
  } {
    return {
      [GeneralTypeEnum.BOOL]: [FilterOperator.ISFALSE, FilterOperator.ISTRUE],
      [GeneralTypeEnum.STRING]: [FilterOperator.EQUAL, FilterOperator.CONTAINS],
      [GeneralTypeEnum.NUMBER]: [
        FilterOperator.EQUAL,
        FilterOperator.GREATETHAN,
        FilterOperator.GREATETHANEQUAL,
        FilterOperator.LESSTHAN,
        FilterOperator.LESSTHANEQUAL,
      ],
    };
  }

  private processTriggerTask(
    task: TaskInput,
    data: ProcessTaskData,
  ): TaskOutput {
    const config = task.config as TriggerTaskConfig;
    if (isEmpty(config.conditions)) {
      return {
        success: true,
        output: {
          match: true,
        },
      };
    }

    try {
      const match = config.conditions.some((conditionList) =>
        conditionList.every((condition) => {
          const acctualValue = get(data.eventData, condition.variable);
          return this.isMatchCondition(
            condition.operator,
            acctualValue,
            condition.value,
          );
        }),
      );

      return {
        success: true,
        output: {
          match,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message,
        },
      };
    }
  }

  private processNotificationTask(
    task: TaskInput,
    data: ProcessTaskData,
  ): Promise<TaskOutput> {
    const config = task.config as NotificationTaskConfig;
    if (config.channel === NotificationChannel.WEBHOOK) {
      return this.notifyWebhook(task, data);
    }
  }

  private parseHeaders(headers: { key: string; value: string }[]): {
    [key: string]: string;
  } {
    return mapValues(keyBy(headers, 'key'), (header) => header.value);
  }

  // TODO accept custom data
  private async notifyWebhook(
    task: TaskInput,
    { event, eventData }: ProcessTaskData,
  ): Promise<TaskOutput> {
    const config = task.config as NotificationTaskConfig;

    try {
      // TODO using data.prev if having custom message task
      const response = {
        eventId: event.id,
        name: `${event.pallet}.${event.name}`,
        description: event.description,
        timestamp: eventData.timestamp,
        time: new Date(eventData.timestamp),
        data: eventData.data,
        hash: eventData.hash,
        success: eventData.success,
      };
      await this.httpService.axiosRef.post(config.config.url, response, {
        headers: {
          Accept: 'application/json',
          ...this.parseHeaders(config.config.headers),
        },
      });

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message,
        },
      };
    }
  }

  private isMatchCondition(
    operator: FilterOperator,
    acctualValue: any,
    expectedValue: any,
  ): boolean {
    switch (operator) {
      case FilterOperator.ISTRUE:
        return acctualValue === true;
      case FilterOperator.ISFALSE:
        return acctualValue === false;
      case FilterOperator.CONTAINS:
        return (acctualValue as string)
          .toLowerCase()
          .includes((expectedValue as string).toLowerCase());
      case FilterOperator.GREATETHAN:
        return (acctualValue as number) > (expectedValue as number);
      case FilterOperator.GREATETHANEQUAL:
        return (acctualValue as number) >= (expectedValue as number);
      case FilterOperator.LESSTHAN:
        return (acctualValue as number) < (expectedValue as number);
      case FilterOperator.LESSTHANEQUAL:
        return (acctualValue as number) <= (expectedValue as number);
      case FilterOperator.EQUAL:
        return acctualValue == expectedValue;
      default:
        return false;
    }
  }
}
