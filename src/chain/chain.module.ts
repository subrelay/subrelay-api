import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChainController } from './chain.controller';
import { Chain } from './chain.entity';
import { ChainService } from './chain.service';
import { SubstrateModule } from 'src/substrate/substrate.module';
import { EventModule } from 'src/event/event.module';

@Module({
  imports: [TypeOrmModule.forFeature([Chain]), SubstrateModule, EventModule],
  controllers: [ChainController],
  providers: [ChainService],
})
export class ChainModule {}
