import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ChainSummary,
  CreateChainRequest,
  UpdateChainRequest,
} from './chain.dto';
import { Chain } from './chain.entity';
import { SubstrateService } from '../substrate/substrate.service';
import { ChainInfo } from '../substrate/substrate.data';
import { EventService } from '../event/event.service';
import { isEmpty } from 'lodash';
import * as defaultChains from './chains.json';

@Injectable()
export class ChainService implements OnModuleInit {
  private readonly logger = new Logger(ChainService.name);

  constructor(
    @InjectRepository(Chain)
    private chainRepository: Repository<Chain>,

    private readonly substrateService: SubstrateService,
    private readonly eventService: EventService,
  ) {}

  async onModuleInit() {
    const chains = await this.getChains();
    if (isEmpty(chains)) {
      await Promise.all(defaultChains.map((data) => this.createChain(data)));
      this.logger.debug(`Inserted default chains`);
    }
  }

  getChains(): Promise<ChainSummary[]> {
    return this.chainRepository
      .createQueryBuilder()
      .select([
        'DISTINCT ON("chainId") uuid',
        'name',
        '"createdAt"',
        'version',
        '"imageUrl"',
        '"chainId"',
      ])
      .orderBy('name', 'ASC')
      .orderBy('"chainId"', 'ASC')
      .addOrderBy('"createdAt"', 'DESC')
      .getRawMany();
  }

  async chainExist(uuid: string): Promise<boolean> {
    return (await this.chainRepository.countBy({ uuid })) > 0;
  }

  async chainExistByChainId(chainId: string): Promise<boolean> {
    return (await this.chainRepository.countBy({ chainId })) > 0;
  }

  getChain(uuid: string): Promise<Chain> {
    return this.chainRepository.findOne({
      where: { uuid },
      relations: {
        events: true,
      },
    });
  }

  async deleteChainByChainId(chainId: string) {
    await this.chainRepository.delete({ chainId });
  }

  async updateChain(uuid: string, input: UpdateChainRequest) {
    await this.chainRepository.update({ uuid }, input);
  }

  async createChain(input: CreateChainRequest): Promise<ChainSummary> {
    const { chainInfo, validRpcs } = await this.getChainInfoByRpcs(input.rpcs);

    if (!chainInfo) {
      throw new Error('Cannot connect to provider by urls in rpcs');
    }

    if (await this.chainExistByChainId(chainInfo.chainId)) {
      throw new Error(`"${chainInfo.chainId}" exists`);
    }

    const chain = await this.insertChain({
      name: input.name,
      imageUrl: input.imageUrl,
      version: chainInfo.runtimeVersion,
      chainId: chainInfo.chainId,
      config: {
        chainDecimals: chainInfo.chainDecimals,
        chainTokens: chainInfo.chainTokens,
        metadataVersion: chainInfo.metadataVersion,
        rpcs: validRpcs,
      },
    });

    await this.eventService.createEvents(chainInfo.events, chain.uuid);

    return chain;
  }

  private insertChain(input: Partial<Chain>): Promise<Chain> {
    return this.chainRepository.save(input);
  }

  private async getChainInfoByRpcs(rpcs: string[]) {
    let chainInfo: ChainInfo;
    const validRpcs: string[] = [];

    for (const rpc of rpcs) {
      const api = await this.substrateService.createAPI(rpc);
      if (api.isConnected) {
        if (!chainInfo) {
          chainInfo = await this.substrateService.getChainInfo(api);
        }
        validRpcs.push(rpc);
      }
    }

    return {
      chainInfo,
      validRpcs,
      invalidRpcs: rpcs.filter((rpc) => !validRpcs.includes(rpc)),
    };
  }
}
