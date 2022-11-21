import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';

@Module({
  imports: [HttpModule],
  providers: [TaskService],
  controllers: [TaskController],
})
export class TaskModule {}
