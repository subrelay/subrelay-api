import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { UserEntity } from './user.entity';
import { CreateUserDto } from './user.dto';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { mockDiscordUser, mockUserEntity } from '../../test/mock-data.util';

describe('UserService', () => {
  let service: UserService;
  let usersRepository: Repository<UserEntity>;
  const userEntity = mockUserEntity();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(UserEntity),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    usersRepository = module.get<Repository<UserEntity>>(
      getRepositoryToken(UserEntity),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUsers', () => {
    it('should return an array of users', async () => {
      jest.spyOn(usersRepository, 'find').mockResolvedValueOnce([userEntity]);

      const result = await service.getUsers();

      expect(result).toEqual([userEntity]);
    });
  });

  describe('getUser', () => {
    it('should return a user by address', async () => {
      jest
        .spyOn(usersRepository, 'findOneBy')
        .mockResolvedValueOnce(userEntity);

      const result = await service.getUser(userEntity.address);

      expect(result).toEqual(userEntity);
    });
  });

  describe('getUserSummary', () => {
    it('should return a user summary by address', async () => {
      jest
        .spyOn(usersRepository, 'findOneBy')
        .mockResolvedValueOnce(userEntity);

      const result = await service.getUserSummary(userEntity.address);

      expect(result).toEqual({
        id: userEntity.id,
        address: userEntity.address,
      });
    });
  });

  describe('getUserById', () => {
    it('should return a user by id', async () => {
      jest
        .spyOn(usersRepository, 'findOneBy')
        .mockResolvedValueOnce(userEntity);

      const result = await service.getUserById(userEntity.id);

      expect(result).toEqual(userEntity);
    });
  });

  describe('getUserByIds', () => {
    it('should return an array of users by ids', async () => {
      jest.spyOn(usersRepository, 'findBy').mockResolvedValueOnce([userEntity]);

      const result = await service.getUserByIds([userEntity.id]);

      expect(result).toEqual([userEntity]);
    });
  });

  describe('updateUserIntegration', () => {
    it('should update user integration', async () => {
      const integration = {
        discord: mockDiscordUser(),
      };
      jest.spyOn(usersRepository, 'update').mockResolvedValueOnce(undefined);

      await service.updateUserIntegration(userEntity.id, integration);

      expect(usersRepository.update).toHaveBeenCalledWith(
        { id: userEntity.id },
        { integration },
      );
    });
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      const input: CreateUserDto = {
        address: 'some-address',
      };
      const user = mockUserEntity();
      const userSummary = {
        id: user.id,
        address: user.address,
      };

      jest.spyOn(usersRepository, 'save').mockResolvedValueOnce(user);

      const result = await service.createUser(input);

      expect(usersRepository.save).toHaveBeenCalledWith({
        ...input,
        id: expect.any(String),
        integration: {},
      });
      expect(result).toEqual(userSummary);
    });
  });
});
