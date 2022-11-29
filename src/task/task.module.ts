import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';
import { Task } from './entity/task.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([Task]), HttpModule],
  providers: [TaskService],
  controllers: [TaskController],
  exports: [TaskService],
})
export class TaskModule {}
