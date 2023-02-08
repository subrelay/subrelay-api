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
