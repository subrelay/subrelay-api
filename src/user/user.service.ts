import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ulid } from 'ulid';
import { CreateUserDto, UserSummary } from './user.dto';
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

  async getUserSummary(
    address: string,
  ): Promise<Pick<UserEntity, 'id' | 'address'>> {
    const user = await this.usersRepository.findOneBy({ address });

    return (
      user && {
        id: user.id,
        address: user.address,
      }
    );
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

  async createUser(input: CreateUserDto): Promise<UserSummary> {
    const id = ulid();
    await this.usersRepository.save({ ...input, id, integration: {} });

    return this.getUserSummary(id);
  }
}
