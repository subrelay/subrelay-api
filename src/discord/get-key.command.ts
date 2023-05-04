import { Command, EventParams, Handler } from '@discord-nestjs/core';
import { ClientEvents } from 'discord.js';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { UserService } from '../user/user.service';

@Command({
  name: 'getkey',
  description: 'Get current key.',
})
export class GetKeyCommand {
  private readonly logger = new Logger(GetKeyCommand.name);
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {}

  @Handler()
  async onGetKeyCommand(
    @EventParams() args: ClientEvents['interactionCreate'],
  ): Promise<string> {
    const chatId = args[0].user.id;
    const user = await this.userService.getUserByDiscordIntegration(chatId);

    if (!user) {
      return "You did't set up any key.";
    } else {
      return `Your key: **${user.key}**`;
    }
  }
}
