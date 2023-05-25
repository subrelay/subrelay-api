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

      return (
        await this.telegramBot.telegram.getChatMember(chatId, parseInt(chatId))
      ).user;
    } catch (error) {
      this.logger.debug('Failed to get telegram info', JSON.stringify(error));
      return null;
    }
  }

  async getUser(userId: string) {
    try {
      if (isEmpty(userId)) {
        return null;
      }

      const user = await this.getChatInfo(userId);
      if (isEmpty(user)) {
        return null;
      }

      const photo = await this.telegramBot.telegram.getUserProfilePhotos(
        parseInt(userId),
      );
      let avatar = null;
      if (photo.total_count > 1) {
        const fileId = photo.photos[0][0]?.file_id;
        avatar =
          fileId && (await this.telegramBot.telegram.getFileLink(fileId));
      }

      return {
        id: userId,
        username: user.username,
        avatar: avatar?.href,
      };
    } catch (error) {
      this.logger.debug('Failed to get user', JSON.stringify(error));
      return null;
    }
  }
}
