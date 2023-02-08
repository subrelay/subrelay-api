import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class WebhookConfig extends AbsConfig {
  @ApiPropertyOptional({ type: WebhookHeader, isArray: true })
  @IsArray()
  @IsOptional()
  @ValidateNested()
  headers: WebhookHeader[];

  @ApiProperty({ example: 'https://example.com' })
  @IsNotEmpty()
  @IsUrl()
  url: string;
}
