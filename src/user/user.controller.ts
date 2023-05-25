import {
  Controller,
  Delete,
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
import { DiscordService } from '../discord/discord.service';

@Controller('user')
export class UserController implements OnModuleInit {
  private telegramService: TelegramService;
  private discordService: DiscordService;

  onModuleInit() {
    this.telegramService = this.moduleRef.get(TelegramService, {
      strict: false,
    });
    this.discordService = this.moduleRef.get(DiscordService, {
      strict: false,
    });
  }
  constructor(private userService: UserService, private moduleRef: ModuleRef) {}

  @Get('/info')
  async getUserInfo(@UserInfo() user: UserEntity): Promise<UserEntity> {
    const telegramId = user.integration?.telegram?.id;
    if (telegramId) {
      const telegramUser = await this.telegramService.getUser(telegramId);
      if (telegramUser) {
        user.integration = {
          ...user.integration,
          telegram: telegramUser,
        };
      }
    }

    const discordId = user.integration?.discord?.id;
    if (discordId) {
      const discordUser = await this.discordService.getUser(discordId);
      if (discordUser) {
        user.integration = {
          ...user.integration,
          discord: discordUser,
        };
      }
    }

    return user;
  }

  @Get('/connections/discord')
  async authorizeDiscordConnection(
    @Query() query: DiscordAuthQueryParams,
    @UserInfo() user: UserEntity,
  ) {
    const { id } = query;

    const discordUser = await this.discordService.getUser(id);
    if (!discordUser) {
      throw new NotFoundException();
    }

    console.log({ discordUser });

    const integration = {
      ...user.integration,
      discord: discordUser,
    };

    await this.userService.updateUserIntegration(user.id, integration);
  }

  @Get('/connections/telegram')
  async authorizeTelegramConnection(
    @Query() query: TelegramAuthQueryParams,
    @UserInfo() user: UserEntity,
  ) {
    const { id } = query;

    const telegramUser = await this.telegramService.getUser(id);
    if (!telegramUser) {
      throw new NotFoundException();
    }

    console.log({ telegramUser });

    const integration = {
      ...user.integration,
      telegram: telegramUser,
    };

    await this.userService.updateUserIntegration(user.id, integration);
  }

  @Delete('/connections/telegram')
  async deleteTelegramConnection(@UserInfo() user: UserEntity) {
    const integration = {
      ...user.integration,
      telegram: null,
    };

    await this.userService.updateUserIntegration(user.id, integration);
  }

  @Delete('/connections/discord')
  async deleteDiscordConnection(@UserInfo() user: UserEntity) {
    const integration = {
      ...user.integration,
      discord: null,
    };

    await this.userService.updateUserIntegration(user.id, integration);
  }
}
