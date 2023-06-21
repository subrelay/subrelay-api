import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowController } from './workflow.controller';
import { WorkflowEntity } from './entity/workflow.entity';
import { WorkflowService } from './workflow.service';
import { WorkflowLogEntity } from './entity/workflow-log.entity';
import { WorkflowLogController } from './workflow-log.controller';
import { TaskModule } from '../task/task.module';
import { EventModule } from '../event/event.module';
import { ChainModule } from '../chain/chain.module';
import { UserModule } from '../user/user.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkflowEntity, WorkflowLogEntity]),
    TaskModule,
    EventModule,
    ChainModule,
    UserModule,
    EventEmitterModule.forRoot(),
  ],
  controllers: [WorkflowController, WorkflowLogController],
  providers: [WorkflowService],
  exports: [WorkflowService],
})
export class WorkflowModule {}
