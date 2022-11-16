import {
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Post,
} from '@nestjs/common';
import { TaskStatus } from 'src/common/common.type';
import { CreateChainRequest } from './chain.dto';
import { Chain } from './chain.entity';
import { ChainService } from './chain.service';

@Controller('chains')
export class ChainController {
  constructor(private readonly chainService: ChainService) {}

  @Get()
  async getChains(): Promise<Chain[]> {
    return this.chainService.getChains();
  }

  @Post()
  async createChain(@Body() input: CreateChainRequest): Promise<Chain> {
    const taskResult = await this.chainService.createChain(input);
    if (taskResult.status === TaskStatus.SUCCESS) {
      return taskResult.output;
    } else {
      throw new InternalServerErrorException(taskResult.error.message);
    }
  }
}
