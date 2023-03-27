import { Update, Ctx, Start, Help, Command } from 'nestjs-telegraf';

@Update()
export class TelegramBotService {
  @Start()
  async start(@Ctx() ctx) {
    await ctx.reply('Welcome to SubRelay Bot');
  }

  @Help()
  async help(@Ctx() ctx) {
    await ctx.reply('Send me a sticker');
  }

  @Command('my_chat_id')
  async get_my_chat_id(@Ctx() ctx) {
    await ctx.reply(`Your chat ID: ${ctx.update.message.chat.id}`);
  }
}
