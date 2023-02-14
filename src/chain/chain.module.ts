import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventModule } from '../event/event.module';
import { SubstrateModule } from '../substrate/substrate.module';
import { ChainController } from './chain.controller';
import { Chain } from './chain.entity';
import { ChainService } from './chain.service';

@Module({
  imports: [TypeOrmModule.forFeature([Chain]), SubstrateModule, EventModule],
  controllers: [ChainController],
  providers: [ChainService],
  exports: [ChainService],
})
export class ChainModule {}
