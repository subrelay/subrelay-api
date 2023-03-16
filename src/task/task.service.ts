import { Injectable, Logger } from '@nestjs/common';
import { get, isEmpty, keyBy, mapValues, pick } from 'lodash';
import {
  BaseTask,
  ProcessStatus,
  ProcessTaskLog,
  TaskOutput,
  TaskType,
} from './type/task.type';
import { HttpService } from '@nestjs/axios';
import { FilterOperator, TriggerTaskConfig } from './type/trigger.type';
import { Task } from './entity/task.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskLog } from './entity/task-log.entity';
import { ProcessTaskInput, TaskLogDetail } from './task.dto';
import { GeneralTypeEnum } from '../substrate/substrate.data';
import {
  NotificationTaskConfig,
  ProcessNotificationTaskInput,
  WebhookConfig,
} from './type/notification.type';

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
    task: BaseTask,
    input: ProcessTaskInput,
  ): Promise<ProcessTaskLog> {
    const startedAt = new Date();
    let output: TaskOutput;

    try {
      if (task.isNotificationTask()) {
        const message = this.buildWebhookMessage(input);

        output = await this.processNotificationTask(
          new NotificationTaskConfig(task.getNotificationTaskConfig()),
          { message },
        );
      } else if (task.isTriggerTask()) {
        output = await this.processTriggerTask(
          new TriggerTaskConfig(task.getTriggerConfig()),
          input as ProcessTaskInput,
        );
      } else {
        output = {
          success: false,
          error: {
            message: `Unsupported type: ${task.type}`,
          },
        };
      }
    } catch (error) {
      output = {
        success: false,
        error: {
          message: error.message,
        },
      };
    }

    return {
      output,
      startedAt,
      finishedAt: new Date(),
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
      [GeneralTypeEnum.BOOL]: [FilterOperator.IS_FALSE, FilterOperator.IS_TRUE],
      [GeneralTypeEnum.STRING]: [FilterOperator.EQUAL, FilterOperator.CONTAINS],
      [GeneralTypeEnum.NUMBER]: [
        FilterOperator.EQUAL,
        FilterOperator.GREATER_THAN,
        FilterOperator.GREATER_THAN_EQUAL,
        FilterOperator.LESS_THAN,
        FilterOperator.LESS_THAN_EQUAL,
      ],
    };
  }

  private processTriggerTask(
    config: TriggerTaskConfig,
    { eventData }: ProcessTaskInput,
  ): TaskOutput {
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
          const actualValue = get(eventData, condition.variable);
          return this.isMatchCondition(
            condition.operator,
            actualValue,
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
    config: NotificationTaskConfig,
    { message }: ProcessNotificationTaskInput,
  ): Promise<TaskOutput> {
    if (config.isWebhookChannel()) {
      return this.notifyWebhook(config.getWebhookConfig(), message);
    }

    throw new Error(`Unsupported channel: ${config.channel}`);
  }

  async getTaskLogs(workflowLogId: number): Promise<TaskLogDetail[]> {
    const taskLogs = await this.taskLogRepository.find({
      where: { workflowLogId },
      relations: {
        task: true,
      },
    });

    return taskLogs;
  }

  private parseHeaders(headers: { key: string; value: string }[]): {
    [key: string]: string;
  } {
    return mapValues(keyBy(headers, 'key'), (header) => header.value);
  }

  buildWebhookMessage({ event, eventData, workflow }: ProcessTaskInput) {
    return {
      eventId: event.id,
      name: `${event.pallet}.${event.name}`,
      description: event.description,
      timestamp: eventData.timestamp,
      time: new Date(eventData.timestamp),
      data: eventData.data,
      block: eventData.block,
      success: eventData.success,
      workflow: pick(workflow, ['id', 'name']),
    };
  }

  private async notifyWebhook(
    { url, headers }: WebhookConfig,
    message: any,
  ): Promise<TaskOutput> {
    try {
      await this.httpService.axiosRef.post(url, message, {
        headers: {
          Accept: 'application/json',
          ...this.parseHeaders(headers),
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
      case FilterOperator.IS_TRUE:
        return acctualValue === true;
      case FilterOperator.IS_FALSE:
        return acctualValue === false;
      case FilterOperator.CONTAINS:
        return (acctualValue as string)
          .toLowerCase()
          .includes((expectedValue as string).toLowerCase());
      case FilterOperator.GREATER_THAN:
        return (acctualValue as number) > (expectedValue as number);
      case FilterOperator.GREATER_THAN_EQUAL:
        return (acctualValue as number) >= (expectedValue as number);
      case FilterOperator.LESS_THAN:
        return (acctualValue as number) < (expectedValue as number);
      case FilterOperator.LESS_THAN_EQUAL:
        return (acctualValue as number) <= (expectedValue as number);
      case FilterOperator.EQUAL:
        return acctualValue == expectedValue;
      default:
        return false;
    }
  }
}
