import { Update, Ctx, Start } from 'nestjs-telegraf';
import { UserService } from '../user/user.service';

@Update()
export class TelegramBotService {
  constructor(private readonly userService: UserService) {}

  @Start()
  async start(@Ctx() ctx) {
    await ctx.reply(`<b>Thanks for the invitation. I am SubRelay Bot!</b>`, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: 'SubRelay Docs', url: 'https://docs.subrelay.xyz/' }],
        ],
      },
    });
  }
}
