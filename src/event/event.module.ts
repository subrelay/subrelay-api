import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubstrateModule } from 'src/substrate/substrate.module';
import { Event } from './event.entity';
import { EventService } from './event.service';

@Module({
  imports: [TypeOrmModule.forFeature([Event]), SubstrateModule],
  providers: [EventService],
  exports: [EventService],
})
export class EventModule {}
