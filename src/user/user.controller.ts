import { Controller, Get, Query } from '@nestjs/common';
import { UserInfo } from '../common/user-info.decorator';
import { UserEntity } from './user.entity';
import {
  DiscordAuthQueryParams,
  TelegramAuthQueryParams,
} from '../discord/discord.type';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

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
    const { id, avatar, username } = query;

    const integration = {
      ...user.integration,
      discord: {
        id,
        username,
        avatar,
      },
    };

    await this.userService.updateUserIntegration(user.id, integration);
  }
}
