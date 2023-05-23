import { IsNotEmpty, IsString } from 'class-validator';

export class DiscordAuthQueryParams {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  avatar: string;
}

export class TelegramAuthQueryParams {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  avatar: string;
}
