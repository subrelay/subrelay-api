import { Global, Module } from '@nestjs/common';
import { WorkflowModule } from '../workflow/workflow.module';
import { TaskModule } from '../task/task.module';
import { EventModule } from '../event/event.module';
import { ChainModule } from '../chain/chain.module';
import { BlockProcessor } from './block.processor';
import { WorkflowProcessor } from './workflow.processor';
import { UserModule } from '../user/user.module';
import { WorkerController } from './worker.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueModule } from '@subrelay/nestjs-queue';

@Global()
@Module({
  imports: [
    WorkflowModule,
    TaskModule,
    EventModule,
    ChainModule,
    UserModule,
    QueueModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],

      useFactory: (configService: ConfigService) => {
        const options = {
          host: configService.get('REDIS_HOST'),
          password: configService.get('REDIS_PASSWORD'),
          port: parseInt(configService.get('REDIS_PORT')),
          queueUrl: configService.get('QUEUE_URL'),
        };
        return {
          consumers: [
            {
              name: 'block',
              ...options,
            },
            {
              name: 'workflow',
              ...options,
            },
          ],
          producers: [
            {
              name: 'workflow',
              ...options,
            },
          ],
        };
      },
    }),
  ],
  controllers: [WorkerController],
  providers: [BlockProcessor, WorkflowProcessor],
})
export class WorkerModule {}
