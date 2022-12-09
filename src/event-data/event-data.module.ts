import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChainModule } from 'src/chain/chain.module';
import { EventModule } from 'src/event/event.module';
import { TaskModule } from 'src/task/task.module';
import { WorkflowModule } from 'src/workflow/workflow.module';
import { EventData } from './event-data.entity';
import { EventDataService } from './event-data.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([EventData]),
    ChainModule,
    WorkflowModule,
    EventModule,
    TaskModule,
  ],
  providers: [EventDataService],
})
export class EventDataModule {}
