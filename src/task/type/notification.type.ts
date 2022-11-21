import { BadRequestException } from '@nestjs/common';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
  validateSync,
} from 'class-validator';

export enum NotificationChannel {
  WEBHOOK = 'webhook',
}

export class NotificationTaskConfig {
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  private _config: WebhookConfig; // Can not using ValidateNested here

  public set config(obj: any) {
    const config = new WebhookConfig(obj);

    const errors = validateSync(config);

    if (errors.length !== 0) {
      const message = errors
        .flatMap((e) => Object.values(e.constraints))
        .join('. ');
      throw new BadRequestException(message);
    }
    this._config = obj;
  }

  public get config(): WebhookConfig {
    return this._config;
  }
}

export class WebhookConfig {
  @IsArray()
  @IsOptional()
  @ValidateNested()
  headers: WebhookHeader[];

  @IsNotEmpty()
  @IsUrl()
  url: string;

  constructor(obj: any) {
    this.url = obj?.url;
    this.headers = obj?.headers;
  }
}

export class WebhookHeader {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  value: string;
}
