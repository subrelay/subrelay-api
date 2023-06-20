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
import { UserSummary } from './user.dto';

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
  async getUserInfo(@UserInfo() user: UserSummary): Promise<UserEntity> {
    const currentUser = await this.userService.getUserById(user.id);

    const telegramId = currentUser.integration?.telegram?.id;
    console.log({ telegramId });

    if (telegramId) {
      console.log(1);

      const telegramUser = await this.telegramService.getUser(telegramId);
      console.log(telegramUser);

      if (telegramUser) {
        currentUser.integration = {
          ...currentUser.integration,
          telegram: telegramUser,
        };
      }
    }

    const discordId = currentUser.integration?.discord?.id;
    if (discordId) {
      const discordUser = await this.discordService.getUser(discordId);
      if (discordUser) {
        currentUser.integration = {
          ...currentUser.integration,
          discord: discordUser,
        };
      }
    }

    return currentUser;
  }

  @Get('/connections/discord')
  async authorizeDiscordConnection(
    @Query() query: DiscordAuthQueryParams,
    @UserInfo() userInfo: UserSummary,
  ) {
    const { id } = query;

    const discordUser = await this.discordService.getUser(id);
    if (!discordUser) {
      throw new NotFoundException();
    }

    const { integration } = await this.userService.getUserById(userInfo.id);

    await this.userService.updateUserIntegration(userInfo.id, {
      ...integration,
      discord: discordUser,
    });
    return this.userService.getUserById(userInfo.id);
  }

  @Get('/connections/telegram')
  async authorizeTelegramConnection(
    @Query() query: TelegramAuthQueryParams,
    @UserInfo() userInfo: UserSummary,
  ) {
    const { id } = query;

    const telegramUser = await this.telegramService.getUser(id);
    if (!telegramUser) {
      throw new NotFoundException();
    }

    const { integration } = await this.userService.getUserById(userInfo.id);

    await this.userService.updateUserIntegration(userInfo.id, {
      ...integration,
      telegram: telegramUser,
    });
    return this.userService.getUserById(userInfo.id);
  }

  @Delete('/connections/telegram')
  async deleteTelegramConnection(@UserInfo() userInfo: UserSummary) {
    const { integration } = await this.userService.getUserById(userInfo.id);
    integration.telegram = null;

    await this.userService.updateUserIntegration(userInfo.id, integration);
  }

  @Delete('/connections/discord')
  async deleteDiscordConnection(@UserInfo() userInfo: UserEntity) {
    const { integration } = await this.userService.getUserById(userInfo.id);
    integration.discord = null;

    await this.userService.updateUserIntegration(userInfo.id, integration);
  }
}
