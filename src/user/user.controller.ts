import {
  Body,
  Controller,
  Get,
  HttpCode,
  OnModuleInit,
  Post,
  Query,
  Redirect,
} from '@nestjs/common';
import { UserInfo } from '../common/user-info.decorator';
import { ModuleRef } from '@nestjs/core';
import { UserEntity } from './user.entity';
import { TelegramService } from '../telegram/telegram.service';
import { DiscordService } from '../discord/discord.service';
import { get, isEmpty } from 'lodash';
import { log } from 'console';
import { DiscordAuthQueryParams } from '../discord/discord.type';

@Controller('user')
export class UserController implements OnModuleInit {
  private telegramService: TelegramService;
  private discordService: DiscordService;

  constructor(private moduleRef: ModuleRef) {}
  onModuleInit() {
    this.telegramService = this.moduleRef.get(TelegramService, {
      strict: false,
    });
    this.discordService = this.moduleRef.get(DiscordService, { strict: false });
  }

  @Get('/info')
  async getUserInfo(@UserInfo() user: UserEntity): Promise<UserEntity> {
    if (!isEmpty(user.integration?.telegram)) {
      const telegramInfo = await this.telegramService.getChatInfo(
        user.integration?.telegram,
      );
      user.integration.telegram = `${get(
        telegramInfo,
        'first_name',
        'Undefined',
      )} (@${get(telegramInfo, 'username', 'undefined')})`;
    } else {
      user.integration.telegram = null;
    }

    if (!isEmpty(user.integration?.discord)) {
      const discordInfo = await this.discordService.getChatInfo(
        user.integration?.discord,
      );

      user.integration.discord = `@${discordInfo?.username || 'undefined'}`;
    } else {
      user.integration.discord = null;
    }

    return user;
  }

  @Get('/connections/discord-auth')
  @HttpCode(302)
  @Redirect()
  async authorizeDiscordConnection(
    @Query() { access_token, state }: DiscordAuthQueryParams,
  ) {
    console.log({
      que,
      bo,
    });

    return {
      que,
      bo,
    };
  }

  @Get('/connections/discord')
  async getDiscordConnection(@UserInfo() user: any) {
    console.log({
      que,
      bo,
    });

    return {
      que,
      bo,
    };
  }
}
