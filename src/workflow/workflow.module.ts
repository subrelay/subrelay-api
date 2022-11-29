import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowController } from './workflow.controller';
import { Workflow } from './entity/workflow.entity';
import { WorkflowService } from './workflow.service';
import { WorkflowVersion } from './entity/workflow-version.entity';
import { TaskModule } from 'src/task/task.module';
import { EventModule } from 'src/event/event.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Workflow, WorkflowVersion]),
    TaskModule,
    EventModule,
  ],
  controllers: [WorkflowController],
  providers: [WorkflowService],
})
export class WorkflowModule {}
