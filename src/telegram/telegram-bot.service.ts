import { isEmpty } from 'lodash';
import { Update, Ctx, Start, Help, Command } from 'nestjs-telegraf';
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

  @Help()
  async help(@Ctx() ctx) {
    await ctx.reply(
      `<b>SubRelay Bot commands</b>:\n
/key - Set up a new key to integrate with SubRelay.
/getkey - Get current key.
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

  @Command('key')
  async set_up_key(@Ctx() ctx) {
    const key = ctx.update.message.text.replace('/key', '').trim();
    const user = await this.userService.getUserByIntegrationKey(key);
    if (!user || isEmpty(key)) {
      await ctx.reply(`Invalid key.`);
    } else {
      const integration = {
        ...user.integration,
        telegram: `${ctx.update.message.chat.id}`,
      };
      await this.userService.updateUserIntegration(user.id, integration);
      await ctx.reply(`Added key.`);
    }
  }

  @Command('getkey')
  async get_key(@Ctx() ctx) {
    const user = await this.userService.getUserByTelegramIntegration(
      ctx.update.message.chat.id,
    );

    if (!user) {
      await ctx.reply(`You did't set up any key.`, {
        parse_mode: 'HTML',
      });
    } else {
      await ctx.reply(`Your key: <b>${user.key}</b>`, {
        parse_mode: 'HTML',
      });
    }
  }
}
