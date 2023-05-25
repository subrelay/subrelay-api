import { Update, Ctx, Start } from 'nestjs-telegraf';
import { UserService } from '../user/user.service';

@Update()
export class TelegramBotService {
  constructor(private readonly userService: UserService) {}

  @Start()
  async start(@Ctx() ctx) {
    await ctx.reply(
      `<b>Thanks for the invitation. I am SubRelay Bot!</b>

If this is the first time you use me, please set up by using /key command.\n
Or try defined commands in /help.\n
      `,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: 'SubRelay Docs', url: 'https://docs.subrelay.xyz/' }],
            [{ text: 'SubRelay Website', url: 'https://app.subrelay.xyz/' }],
          ],
        },
      },
    );
  }
}
