import { IsArray, IsNotEmpty, IsString, IsUrl } from 'class-validator';
import { ChainConfig } from './chain.entity';

export class CreateChainRequest {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsUrl()
  imageUrl: string;

  @IsArray()
  @IsNotEmpty()
  rpcs: string[];
}

export class UpdateChainRequest {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsUrl()
  imageUrl: string;
}

export class ChainSummary {
  uuid: string;
  chainId: string;
  createdAt: string;
  version: string;
  name: string;
  imageUrl: string;
}

export class Chain {
  uuid: string;
  name: string;
  config: ChainConfig;
}
