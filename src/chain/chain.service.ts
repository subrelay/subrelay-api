import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateChainRequest } from './chain.dto';
import { Chain } from './chain.entity';
import { SubstrateService } from '../substrate/substrate.service';
import { ChainInfo } from '../substrate/substrate.data';
import { EventService } from '../event/event.service';
import { TaskOutput } from '../task/type/task.type';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AppEvent, getBlockWatcherJobName } from 'src/common/app-event.type';

@Injectable()
export class ChainService {
  constructor(
    @InjectRepository(Chain)
    private chainRepository: Repository<Chain>,

    private readonly substrateService: SubstrateService,
    private readonly eventService: EventService,
    private eventEmitter: EventEmitter2,
  ) {}

  getChains(): Promise<Chain[]> {
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

  getChain(uuid: string): Promise<Chain> {
    return this.chainRepository.findOne({
      where: { uuid },
      relations: {
        events: true,
      },
    });
  }

  async deleteChain(uuid: string) {
    const chain = await this.chainRepository.findOne({
      where: { uuid },
    });

    await this.chainRepository.delete({ uuid });

    this.eventEmitter.emit(AppEvent.JOB_STOP, getBlockWatcherJobName(chain));
  }

  async createChain(input: CreateChainRequest): Promise<TaskOutput> {
    const { chainInfo, validRpcs } = await this.getChainInfoByRpcs(input.rpcs);

    if (!chainInfo) {
      throw new Error('Cannot connect to provider by urls in rpcs');
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

    return {
      success: true,
      // output: chain,
    };
  }

  private async upgradeChain(chainId: string): Promise<TaskOutput> {
    const latestVersion = await this.chainRepository.findOne({
      where: {
        chainId,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    const { chainInfo, validRpcs } = await this.getChainInfoByRpcs(
      latestVersion.config.rpcs,
    );

    if (chainInfo.runtimeVersion === latestVersion.version) {
      const chain = await this.insertChain({
        name: latestVersion.name,
        imageUrl: latestVersion.imageUrl,
        version: chainInfo.runtimeVersion,
        chainId: chainInfo.chainId,
        config: {
          chainDecimals: chainInfo.chainDecimals,
          chainTokens: chainInfo.chainTokens,
          metadataVersion: chainInfo.metadataVersion,
          rpcs: validRpcs,
        },
      });

      return {
        success: true,
        output: chain,
      };
    } else {
      return {
        success: false,
        error: {
          message: 'Latest version',
        },
      };
    }
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
