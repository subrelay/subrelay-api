import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowController } from './workflow.controller';
import { WorkflowEntity } from './entity/workflow.entity';
import { WorkflowService } from './workflow.service';
import { BlockProcessor } from '../worker/block.processor';
import { WorkflowLogEntity } from './entity/workflow-log.entity';
import { WorkflowProcessor } from '../worker/workflow.processor';
import { WorkflowLogController } from './workflow-log.controller';
import { TaskModule } from '../task/task.module';
import { EventModule } from '../event/event.module';
import { ChainModule } from '../chain/chain.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkflowEntity, WorkflowLogEntity]),
    TaskModule,
    EventModule,
    ChainModule,
  ],
  controllers: [WorkflowController, WorkflowLogController],
  providers: [WorkflowService],
  exports: [WorkflowService],
})
export class WorkflowModule {}
