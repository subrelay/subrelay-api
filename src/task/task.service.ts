import { Injectable } from '@nestjs/common';
import {
  NotificationChannel,
  NotificationTaskConfig,
} from 'src/task/type/notification.type';
import { ProcessTaskInput } from './task.dto';
import { keyBy, mapValues } from 'lodash';
import { TaskOutput, TaskType } from './type/task.type';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class TaskService {
  constructor(private readonly httpService: HttpService) {}
  async processTask(input: ProcessTaskInput): Promise<TaskOutput> {
    let result: TaskOutput = null;
    if (input.task.type === TaskType.NOTIFICATION) {
      result = await this.processNotificationTask(input);
    }

    if (!input.task.dependOn) {
      return result;
    }
  }

  processNotificationTask(input: ProcessTaskInput): Promise<TaskOutput> {
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
}
