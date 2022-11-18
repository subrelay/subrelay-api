import { Body, Controller, Get, Post } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './user.dto';
import { User } from './user.entity';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async getUsers(): Promise<User[]> {
    return this.userService.getUsers();
  }

  @Post()
  async createUser(@Body() input: CreateUserDto): Promise<User> {
    return this.userService.createUser(input);
  }
}
