import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubstrateModule } from '../substrate/substrate.module';
import { EventEntity } from './event.entity';
import { EventService } from './event.service';

@Module({
  imports: [TypeOrmModule.forFeature([EventEntity]), SubstrateModule],
  providers: [EventService],
  exports: [EventService],
})
export class EventModule {}
