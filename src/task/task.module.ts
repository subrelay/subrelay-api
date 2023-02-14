import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';
import { Task } from './entity/task.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskLog } from './entity/task-log.entity';
import { EventModule } from '../event/event.module';

@Module({
  imports: [TypeOrmModule.forFeature([Task, TaskLog]), HttpModule, EventModule],
  providers: [TaskService],
  controllers: [TaskController],
  exports: [TaskService],
})
export class TaskModule {}
