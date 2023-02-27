import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class CreateChainRequest {
  @ApiProperty({ example: 'Polkadot' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    example: 'https://cryptologos.cc/logos/polkadot-new-dot-logo.png?v=023',
  })
  @IsNotEmpty()
  @IsUrl()
  imageUrl: string;

  @ApiProperty({
    example: ['wss: //rpc.polkadot.io'],
  })
  @IsArray()
  @IsNotEmpty()
  rpcs: string[];
}

export class UpdateChainRequest {
  @ApiProperty({ example: 'Polkadot' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    example: 'https://cryptologos.cc/logos/polkadot-new-dot-logo.png?v=023',
  })
  @IsNotEmpty()
  @IsUrl()
  imageUrl: string;
}

export class ChainSummary {
  @ApiProperty({
    example: '3342b0eb-ab4f-40c0-870c-6587de6b009a',
  })
  uuid: string;

  @ApiProperty({ example: 'polkadot' })
  chainId: string;

  @ApiProperty({ example: '2022-11-18T00: 51: 30.082Z' })
  createdAt: string;

  @ApiProperty({ example: '9300' })
  version: string;

  @ApiProperty({ example: 'Polkadot' })
  name: string;

  @ApiProperty({
    example: 'https://cryptologos.cc/logos/polkadot-new-dot-logo.png?v=023',
  })
  imageUrl: string;
}
