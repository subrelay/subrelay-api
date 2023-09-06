import { Global, Module } from '@nestjs/common';
import { WorkflowModule } from '../workflow/workflow.module';
import { TaskModule } from '../task/task.module';
import { EventModule } from '../event/event.module';
import { ChainModule } from '../chain/chain.module';
import { BlockProcessor } from './block.processor';
import { WorkflowProcessor } from './workflow.processor';
import { UserModule } from '../user/user.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueModule } from '@subrelay/nestjs-queue';
import { WORKFLOW_QUEUE, BLOCK_QUEUE } from './queue.constants';

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
              name: BLOCK_QUEUE,
              ...options,
            },
            {
              name: WORKFLOW_QUEUE,
              ...options,
            },
          ],
          producers: [
            {
              name: WORKFLOW_QUEUE,
              ...options,
            },
          ],
        };
      },
    }),
  ],
  providers: [BlockProcessor, WorkflowProcessor],
})
export class WorkerModule {}
