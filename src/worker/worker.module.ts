import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { WorkflowModule } from '../workflow/workflow.module';
import { TaskModule } from '../task/task.module';
import { EventModule } from '../event/event.module';
import { ChainModule } from '../chain/chain.module';
import { BlockProcessor } from './block.processor';
import { WorkflowProcessor } from './workflow.processor';
import { UserModule } from '../user/user.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { WorkerController } from './worker.controller';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'workflow',
    }),
    BullModule.registerQueue({
      name: 'block',
    }),
    WorkflowModule,
    TaskModule,
    EventModule,
    ChainModule,
    UserModule,
    EventEmitterModule.forRoot(),
  ],
  controllers: [WorkerController],
  providers: [BlockProcessor, WorkflowProcessor],
})
export class WorkerModule {}
