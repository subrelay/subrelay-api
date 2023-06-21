import { Module } from '@nestjs/common';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';
import { TaskEntity } from './entity/task.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskLogEntity } from './entity/task-log.entity';
import { EventModule } from '../event/event.module';
import { UserModule } from '../user/user.module';
import { DiscordProcessorModule } from '../discord/discord.module';
import { TelegramModule } from '../telegram/telegram.module';
import { EmailModule } from '../email/email.module';
import { WebhookModule } from '../webhook/webhook.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TaskEntity, TaskLogEntity]),
    EventModule,
    UserModule,
    EmailModule,
    DiscordProcessorModule,
    TelegramModule,
    WebhookModule,
  ],
  providers: [TaskService],
  controllers: [TaskController],
  exports: [TaskService],
})
export class TaskModule {}
