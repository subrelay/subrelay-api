import { Injectable } from '@nestjs/common';
import {
  NotificationChannel,
  NotificationTaskConfig,
} from 'src/task/type/notification.type';
import { ProcessTaskInput } from './task.dto';
import { get, isEmpty, keyBy, mapValues } from 'lodash';
import { TaskOutput, TaskType } from './type/task.type';
import { HttpService } from '@nestjs/axios';
import { FilterOperator, TriggerTaskConfig } from './type/trigger.type';
import { GeneralTypeEnum } from 'src/substrate/substrate.data';

@Injectable()
export class TaskService {
  constructor(private readonly httpService: HttpService) {}
  async processTask(input: ProcessTaskInput): Promise<TaskOutput> {
    let result: TaskOutput = null;
    if (input.task.type === TaskType.NOTIFICATION) {
      result = await this.processNotificationTask(input);
    }

    if (input.task.type === TaskType.TRIGGER) {
      result = await this.processTriggerTask(input);
    }

    if (!input.task.dependOn) {
      return result;
    }
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

  private processTriggerTask(input: ProcessTaskInput): TaskOutput {
    const config = input.task.config as TriggerTaskConfig;
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
          const acctualValue = get(input.data, condition.variable);
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
    input: ProcessTaskInput,
  ): Promise<TaskOutput> {
    const config = input.task.config as NotificationTaskConfig;
    if (config.channel === NotificationChannel.WEBHOOK) {
      return this.notifyWebhook(input);
    }
  }

  private parseHeaders(headers: { key: string; value: string }[]): {
    [key: string]: string;
  } {
    return mapValues(keyBy(headers, 'key'), (header) => header.value);
  }

  private async notifyWebhook(input: ProcessTaskInput): Promise<TaskOutput> {
    const config = input.task.config as NotificationTaskConfig;

    try {
      await this.httpService.axiosRef.get(config.config.url, {
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
    console.log(operator, acctualValue, expectedValue);

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
      default:
        return false;
    }
  }
}
