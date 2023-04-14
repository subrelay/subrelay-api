import { Module } from '@nestjs/common';
import { ChainWorker } from './chain.worker';
import { BullModule } from '@nestjs/bull';
import { WorkflowModule } from '../workflow/workflow.module';
import { TaskModule } from '../task/task.module';
import { EventModule } from '../event/event.module';
import { ChainModule } from '../chain/chain.module';
import { BlockProcessor } from './block.processor';
import { WorkflowProcessor } from './workflow.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'chain',
    }),
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
  ],
  providers: [ChainWorker, BlockProcessor, WorkflowProcessor],
})
export class WorkerModule {}
