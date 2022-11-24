import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { AbsConfig, TaskOutput } from './task.type';

export enum NotificationChannel {
  WEBHOOK = 'webhook',
}

export class NotificationTaskConfig extends AbsConfig {
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  config: WebhookConfig; // Can not using ValidateNested here

  validate(): TaskOutput {
    const result = super.validate();

    if (!result.success) {
      return result;
    }

    return new WebhookConfig(this.config).validate();
  }
}

export class WebhookConfig extends AbsConfig {
  @IsArray()
  @IsOptional()
  @ValidateNested()
  headers: WebhookHeader[];

  @IsNotEmpty()
  @IsUrl()
  url: string;
}

export class WebhookHeader {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  value: string;
}
