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

  async getChatInfo(chatId: string) {
    try {
      if (isEmpty(chatId)) {
        return null;
      }

      return await this.discordClient.users.fetch(chatId);
    } catch (error) {
      this.logger.debug('Failed to get discord info', JSON.stringify(error));
      return null;
    }
  }

  async getUser(userId: string) {
    if (isEmpty(userId)) {
      return null;
    }

    const user = await this.getChatInfo(userId);

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
