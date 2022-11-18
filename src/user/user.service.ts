import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './user.dto';
import { User } from './user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  getUsers(): Promise<User[]> {
    return this.usersRepository.find();
  }

  createUser(input: CreateUserDto): Promise<User> {
    return this.usersRepository.save(input);
  }
}
