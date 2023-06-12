import { IsNotEmpty, IsString } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  address: string;
}

export class UserSummary {
  id: string;
  address: string;
}
