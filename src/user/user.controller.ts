import { Controller, Get } from '@nestjs/common';
import { UserService } from './user.service';
import { UserInfo } from '../common/user-info.decorator';
import { UserEntity } from './user.entity';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('/info')
  getUserInfo(@UserInfo() user: UserEntity): UserEntity {
    return user;
  }
}
