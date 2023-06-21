import { IsNotEmpty, IsString } from 'class-validator';

export class DiscordAuthQueryParams {
  @IsString()
  @IsNotEmpty()
  id: string;
}

export class TelegramAuthQueryParams {
  @IsString()
  @IsNotEmpty()
  id: string;
}
