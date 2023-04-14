import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ChainSummary,
  CreateChainRequest,
  UpdateChainRequest,
} from './chain.dto';
import { ChainEntity } from './chain.entity';
import { SubstrateService } from '../substrate/substrate.service';
import { ChainInfo } from '../substrate/substrate.data';
import { EventService } from '../event/event.service';
import { isEmpty } from 'lodash';
import * as defaultChains from './chains.json';
import { ulid } from 'ulid';
import { EventEntity } from '../event/event.entity';
import { UserInputError } from '../common/error.type';

@Injectable()
export class ChainService implements OnModuleInit {
  private readonly logger = new Logger(ChainService.name);

  constructor(
    @InjectRepository(ChainEntity)
    private chainRepository: Repository<ChainEntity>,

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

  async getChainsByEventIds(eventIds: string[]): Promise<
    {
      chainId: ChainEntity['chainId'];
      config: ChainEntity['config'];
    }[]
  > {
    return this.chainRepository
      .createQueryBuilder('c')
      .innerJoin(EventEntity, 'e', 'e."chainUuid" = c.uuid')
      .where('e.id IN (:...eventIds)', { eventIds })
      .select(['DISTINCT "chainId", "config"'])
      .getRawMany();
  }

  getChains(): Promise<ChainSummary[]> {
    return this.chainRepository
      .createQueryBuilder()
      .select([
        'uuid',
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

  getChain(uuid: string): Promise<ChainEntity> {
    return this.chainRepository.findOne({
      where: { uuid },
      relations: {
        events: true,
      },
    });
  }

  async deleteChainByChainId(uuid: string) {
    await this.chainRepository.delete({ uuid });
  }

  async updateChain(
    uuid: string,
    input: UpdateChainRequest,
  ): Promise<ChainSummary> {
    return this.chainRepository.save({ uuid, ...input });
  }

  async createChain(input: CreateChainRequest): Promise<ChainSummary> {
    const { chainInfo, validRpcs } = await this.getChainInfoByRpcs(input.rpcs);

    if (!chainInfo) {
      throw new UserInputError('Cannot connect to provider by urls in rpcs');
    }

    if (await this.chainExistByChainId(chainInfo.chainId)) {
      throw new UserInputError(`"${chainInfo.chainId}" exists`);
    }

    const chain = await this.insertChain({
      uuid: ulid(),
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

  private insertChain(input: Partial<ChainEntity>): Promise<ChainEntity> {
    return this.chainRepository.save({ ...input, uuid: ulid() });
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
      } else {
        throw new UserInputError(`Invalid rpc: ${rpc}. Connection failed.`);
      }
    }

    return {
      chainInfo,
      validRpcs,
      invalidRpcs: rpcs.filter((rpc) => !validRpcs.includes(rpc)),
    };
  }
}
