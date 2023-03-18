import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNotEmptyObject,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
  validateSync,
} from 'class-validator';
import { isEmpty } from 'lodash';
import { TaskValidationError } from './task.type';

export enum NotificationChannel {
  WEBHOOK = 'webhook',
  TELEGRAM = 'telegram',
  EMAIL = 'email',
}

export class NotificationTaskConfig {
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @IsNotEmptyObject()
  config: any;

  constructor(taskConfig: any) {
    Object.assign(this, taskConfig);

    const errors = validateSync(this);
    if (!isEmpty(errors)) {
      const message = errors
        .map((e) => Object.values(e.constraints).join('. '))
        .join('. ');
      throw new TaskValidationError(message);
    }

    switch (this.channel) {
      case NotificationChannel.WEBHOOK:
        this.config = new WebhookConfig(this.config);
        break;
      case NotificationChannel.TELEGRAM:
        this.config = new TelegramConfig(this.config);
        break;
      case NotificationChannel.EMAIL:
        this.config = new EmailConfig(this.config);
        break;
      default:
        throw new TaskValidationError(
          `Unsupported channel: ${this.config.channel}`,
        );
    }
  }

  isWebhookChannel(): boolean {
    return this.channel === NotificationChannel.WEBHOOK;
  }

  getWebhookConfig(): WebhookConfig {
    return this.config;
  }

  getTelegramConfig(): TelegramConfig {
    return this.config;
  }

  isTelegramChannel(): boolean {
    return this.channel === NotificationChannel.TELEGRAM;
  }

  getEmailConfig(): EmailConfig {
    return this.config;
  }

  isEmailChannel(): boolean {
    return this.channel === NotificationChannel.EMAIL;
  }
}

export class WebhookHeader {
  @ApiProperty({ example: 'Header 1' })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({ example: 'Value 1' })
  @IsString()
  @IsNotEmpty()
  value: string;
}

export class WebhookConfig {
  @ApiPropertyOptional({ type: WebhookHeader, isArray: true })
  @IsArray()
  @IsOptional()
  @ValidateNested()
  headers: WebhookHeader[];

  @ApiProperty({ example: 'https://example.com' })
  @IsNotEmpty()
  @IsUrl()
  url: string;

  constructor(config: any) {
    Object.assign(this, config);
    const errors = validateSync(this);
    if (!isEmpty(errors)) {
      const message = errors
        .map((e) => Object.values(e.constraints).join('. '))
        .join('. ');
      throw new TaskValidationError(message);
    }
  }
}

export class TelegramConfig {
  @ApiProperty({ type: 'string', example: '123sdfs21423' })
  @IsString()
  @IsNotEmpty()
  chatId: string;

  constructor(config: any) {
    Object.assign(this, config);

    const errors = validateSync(this);
    if (!isEmpty(errors)) {
      const message = errors
        .map((e) => Object.values(e.constraints).join('. '))
        .join('. ');
      throw new TaskValidationError(message);
    }
  }
}

export class EmailConfig {
  @ApiProperty({
    type: 'string',
    isArray: true,
    example: ['example@gmail.com'],
  })
  @IsArray()
  @IsNotEmpty()
  addresses: string[];

  @ApiProperty({
    type: 'string',
    isArray: true,
    example: ['data.from', 'data.to'],
  })
  @IsArray()
  @IsNotEmpty()
  variables: string[];

  @ApiProperty({
    type: 'string',
    example: 'Your email subject',
  })
  @IsString()
  @IsNotEmpty()
  subjectTemplate: string;

  @ApiProperty({
    type: 'string',
    example: 'Your email content',
  })
  @IsString()
  @IsNotEmpty()
  contentTemplate: string;

  constructor(config: any) {
    Object.assign(this, config);

    const errors = validateSync(this);
    if (!isEmpty(errors)) {
      const message = errors
        .map((e) => Object.values(e.constraints).join('. '))
        .join('. ');
      throw new TaskValidationError(message);
    }
  }
}
