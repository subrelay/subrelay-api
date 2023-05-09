import { InjectDiscordClient } from '@discord-nestjs/core';
import { Injectable } from '@nestjs/common';
import { Client } from 'discord.js';

@Injectable()
export class DiscordService {
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
    return await this.discordClient.users.cache.get(chatId);
  }
}
