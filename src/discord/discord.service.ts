import { InjectDiscordClient } from '@discord-nestjs/core';
import { Injectable, Logger } from '@nestjs/common';
import { Client } from 'discord.js';
import { isEmpty } from 'lodash';

@Injectable()
export class DiscordService {
  private readonly logger = new Logger(DiscordService.name);

  constructor(
    @InjectDiscordClient()
    private readonly discordClient: Client,
  ) {}

  async sendDirectMessage(chatId: string, message: string) {
    await this.discordClient.users.send(chatId, {
      embeds: [
        {
          color: 0,
          description: message,
        },
      ],
    });
  }

  async getUser(userId: string) {
    if (isEmpty(userId)) {
      return null;
    }

    const user = await this.discordClient.users.fetch(userId);

    if (isEmpty(user)) {
      return null;
    }

    return {
      id: user.id,
      username: `${user.username}#${user.discriminator}`,
      avatar: user.avatarURL(),
    };
  }
}
