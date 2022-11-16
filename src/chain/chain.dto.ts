import { IsArray, IsNotEmpty, IsString, IsUrl, MinLength } from 'class-validator';

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
