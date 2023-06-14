import { IsArray, IsNotEmpty, IsString, IsUrl } from 'class-validator';

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
