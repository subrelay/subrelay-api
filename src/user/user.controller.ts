import { Controller, Get, OnModuleInit } from '@nestjs/common';
import { UserInfo } from '../common/user-info.decorator';
import { ModuleRef } from '@nestjs/core';
import { UserEntity } from './user.entity';
import { TelegramService } from '../telegram/telegram.service';
import { DiscordService } from '../discord/discord.service';
import { get } from 'lodash';

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
    const telegramInfo = await this.telegramService.getChatInfo(
      user.integration?.telegram,
    );
    user.integration.telegram = `${get(telegramInfo, 'first_name')} (@${get(
      telegramInfo,
      'username',
    )})`;

    const discordInfo = await this.discordService.getChatInfo(
      user.integration?.discord,
    );
    user.integration.discord = `@${discordInfo.username}`;

    return user;
  }
}
