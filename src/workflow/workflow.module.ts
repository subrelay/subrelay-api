import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowController } from './workflow.controller';
import { Workflow } from './entity/workflow.entity';
import { WorkflowService } from './workflow.service';
import { WorkflowVersion } from './entity/workflow-version.entity';
import { BlockProcessor } from './block.processor';
import { WorkflowLog } from './entity/workflow-log.entity';
import { WorkflowProcessor } from './workflow.processor';
import { WorkflowLogController } from './workflow-log.controller';
import { TaskModule } from '../task/task.module';
import { EventModule } from '../event/event.module';
import { ChainModule } from '../chain/chain.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'workflow',
    }),
    TypeOrmModule.forFeature([Workflow, WorkflowVersion, WorkflowLog]),
    TaskModule,
    EventModule,
    ChainModule,
  ],
  controllers: [WorkflowController, WorkflowLogController],
  providers: [WorkflowService, BlockProcessor, WorkflowProcessor],
  exports: [WorkflowService],
})
export class WorkflowModule {}
