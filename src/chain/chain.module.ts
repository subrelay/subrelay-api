import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventModule } from '../event/event.module';
import { SubstrateModule } from '../substrate/substrate.module';
import { ChainController } from './chain.controller';
import { ChainEntity } from './chain.entity';
import { ChainService } from './chain.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChainEntity]),
    SubstrateModule,
    EventModule,
  ],
  controllers: [ChainController],
  providers: [ChainService],
  exports: [ChainService],
})
export class ChainModule {}
