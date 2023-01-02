import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowController } from './workflow.controller';
import { Workflow } from './entity/workflow.entity';
import { WorkflowService } from './workflow.service';
import { WorkflowVersion } from './entity/workflow-version.entity';
import { TaskModule } from 'src/task/task.module';
import { EventModule } from 'src/event/event.module';
import { BlockProcessor } from './block.processor';
import { WorkflowLog } from './entity/workflow-log.entity';
import { WorkflowProcessor } from './workflow.processor';
import { WorkflowLogController } from './workflow-log.controller';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'workflow',
    }),
    TypeOrmModule.forFeature([Workflow, WorkflowVersion, WorkflowLog]),
    TaskModule,
    EventModule,
  ],
  controllers: [WorkflowController, WorkflowLogController],
  providers: [WorkflowService, BlockProcessor, WorkflowProcessor],
  exports: [WorkflowService],
})
export class WorkflowModule {}
