import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ulid } from 'ulid';
import { CreateUserDto } from './user.dto';
import { UserEntity } from './user.entity';
import { UserIntegration } from './user.type';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
  ) {}

  getUsers(): Promise<UserEntity[]> {
    return this.usersRepository.find();
  }

  getUser(address: string): Promise<UserEntity> {
    return this.usersRepository.findOneBy({ address });
  }

  getUserById(id: string): Promise<UserEntity> {
    return this.usersRepository.findOneBy({ id });
  }

  getUserByIds(ids: string[]): Promise<UserEntity[]> {
    return this.usersRepository.findBy({ id: In(ids) });
  }

  async updateUserIntegration(userId: string, integration: UserIntegration) {
    await this.usersRepository.update({ id: userId }, { integration });
  }

  createUser(input: CreateUserDto): Promise<UserEntity> {
    return this.usersRepository.save({ ...input, id: ulid(), integration: {} });
  }
}
