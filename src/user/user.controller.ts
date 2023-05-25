import {
  Controller,
  Get,
  NotFoundException,
  OnModuleInit,
  Query,
} from '@nestjs/common';
import { UserInfo } from '../common/user-info.decorator';
import { UserEntity } from './user.entity';
import {
  DiscordAuthQueryParams,
  TelegramAuthQueryParams,
} from '../discord/discord.type';
import { UserService } from './user.service';
import { ModuleRef } from '@nestjs/core';
import { TelegramService } from '../telegram/telegram.service';

@Controller('user')
export class UserController implements OnModuleInit {
  private telegramService: TelegramService;

  onModuleInit() {
    this.telegramService = this.moduleRef.get(TelegramService, {
      strict: false,
    });
  }
  constructor(private userService: UserService, private moduleRef: ModuleRef) {}

  @Get('/info')
  async getUserInfo(@UserInfo() user: UserEntity): Promise<UserEntity> {
    return user;
  }

  @Get('/connections/discord')
  async authorizeDiscordConnection(
    @Query() query: DiscordAuthQueryParams,
    @UserInfo() user: UserEntity,
  ) {
    const integration = {
      ...user.integration,
      discord: {
        id: query.id,
        username: `${query.username}`,
        avatar: `https://cdn.discordapp.com/avatars/${query.id}/${query.avatar}.png`,
      },
    };

    await this.userService.updateUserIntegration(user.id, integration);
  }

  @Get('/connections/telegram')
  async authorizeTelegramConnection(
    @Query() query: TelegramAuthQueryParams,
    @UserInfo() user: UserEntity,
  ) {
    const { id, username } = query;

    const telegramUser = await this.telegramService.getChatInfo(id);
    if (!telegramUser) {
      throw new NotFoundException();
    }
    const avatar = await this.telegramService.getAvatar(parseInt(id));

    const integration = {
      ...user.integration,
      telegram: {
        id,
        username,
        avatar,
      },
    };

    await this.userService.updateUserIntegration(user.id, integration);
  }
}
