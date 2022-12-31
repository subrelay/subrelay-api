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

@Module({
  imports: [
    TypeOrmModule.forFeature([Workflow, WorkflowVersion, WorkflowLog]),
    BullModule.registerQueue({
      name: 'workflow',
    }),
    TaskModule,
    EventModule,
  ],
  controllers: [WorkflowController],
  providers: [WorkflowService, BlockProcessor],
  exports: [WorkflowService],
})
export class WorkflowModule {}
