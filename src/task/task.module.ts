import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';
import { TaskEntity } from './entity/task.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskLogEntity } from './entity/task-log.entity';
import { EventModule } from '../event/event.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import { TelegramBotService } from './telegram-bot.update';

@Module({
  imports: [
    TypeOrmModule.forFeature([TaskEntity, TaskLogEntity]),
    HttpModule,
    EventModule,
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.get('EMAIL_HOST'),
          port: configService.get('EMAIL_PORT'),
          secure: true,
          auth: {
            user: configService.get('EMAIL_USERNAME'),
            pass: configService.get('EMAIL_PASSWORD'),
          },
        },
      }),
    }),
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
  providers: [TaskService, TelegramBotService],
  controllers: [TaskController],
  exports: [TaskService],
})
export class TaskModule {}
