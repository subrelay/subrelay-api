import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserModule } from '../user/user.module';
import { TelegramService } from './telegram.service';
import { TelegrafModule } from 'nestjs-telegraf';

@Module({
  imports: [
    UserModule,
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        token: configService.get('TELEGRAM_BOT_TOKEN'),
        launchOptions: {
          webhook: {
            domain: configService.get('API_BASE_URL'),
            hookPath: '/telegram-bot',
          },
        },
      }),
    }),
  ],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
