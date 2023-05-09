import { Injectable, Logger } from '@nestjs/common';
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
    return this.getChatInfo(chatId);
  }

  async getChatInfo(chatId: string) {
    try {
      return await this.telegramBot.telegram.getChat(chatId);
    } catch (error) {
      if (error.response.error_code === 400) {
        throw new Error('Chat not found.');
      }

      this.logger.debug(
        'Failed to check telegram chatId:',
        JSON.stringify(error),
      );
      throw new Error('Failed to check chat ID.');
    }
  }
}
