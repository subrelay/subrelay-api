import { Injectable, Logger } from '@nestjs/common';
import { isEmpty } from 'lodash';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    @InjectBot()
    private telegramBot: Telegraf,
  ) {}

  async sendDirectMessage(chatId: string, message: string) {
    await this.telegramBot.telegram.sendMessage(chatId, message, {
      parse_mode: 'HTML',
    });
  }

  async validateChatId(chatId: string) {
    const info = await this.getChatInfo(chatId);
    if (!info) {
      throw new Error('Chat not found.');
    }
  }

  async getChatInfo(chatId: string) {
    try {
      if (isEmpty(chatId)) {
        return null;
      }

      return await this.telegramBot.telegram.getChat(chatId);
    } catch (error) {
      this.logger.debug('Failed to get telegram info', JSON.stringify(error));
      return null;
    }
  }

  async getAvatar(photoId: string) {
    try {
      if (isEmpty(photoId)) {
        return null;
      }

      return await this.telegramBot.telegram.getFileLink(photoId);
    } catch (error) {
      this.logger.debug('Failed to get user photo', JSON.stringify(error));
      return null;
    }
  }
}
