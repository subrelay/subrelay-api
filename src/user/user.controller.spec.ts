import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserEntity } from './user.entity';
import { UserSummary } from './user.dto';
import { TelegramService } from '../telegram/telegram.service';
import { DiscordService } from '../discord/discord.service';
import {
  mockDiscordUser,
  mockTelegramUser,
  mockUserEntity,
} from '../../test/mock-data.util';
import { NotFoundException } from '@nestjs/common';

describe('UserController', () => {
  let controller: UserController;
  let userService: UserService;
  let telegramService: TelegramService;
  let discordService: DiscordService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: TelegramService,
          useValue: {
            getUser: jest.fn(),
          },
        },
        {
          provide: DiscordService,
          useValue: {
            getUser: jest.fn(),
          },
        },
        {
          provide: UserService,
          useValue: {
            getUserById: jest.fn(),
            updateUserIntegration: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    userService = module.get<UserService>(UserService);
    telegramService = module.get<TelegramService>(TelegramService);
    discordService = module.get<DiscordService>(DiscordService);
    controller.onModuleInit();
  });

  describe('getUserInfo', () => {
    it('should return the current user with integration data for Telegram and Discord', async () => {
      // Arrange
      const currentUser: UserEntity = {
        id: '123',
        address: '123',
        createdAt: new Date(),
        integration: {
          telegram: mockTelegramUser(),
          discord: mockDiscordUser(),
        },
      };
      jest.spyOn(userService, 'getUserById').mockResolvedValueOnce(currentUser);
      jest
        .spyOn(telegramService, 'getUser')
        .mockResolvedValueOnce(currentUser.integration.telegram);
      jest
        .spyOn(discordService, 'getUser')
        .mockResolvedValueOnce(currentUser.integration.discord);

      const userSummary: UserSummary = {
        id: currentUser.id,
        address: currentUser.address,
      };

      const result = await controller.getUserInfo(userSummary);

      expect(result).toEqual(currentUser);
      expect(userService.getUserById).toHaveBeenCalledWith(userSummary.id);
      expect(telegramService.getUser).toHaveBeenCalledWith(
        currentUser.integration.telegram.id,
      );
      expect(discordService.getUser).toHaveBeenCalledWith(
        currentUser.integration.discord.id,
      );
    });

    it('should return the current user without integration data for Telegram and Discord', async () => {
      const currentUser: UserEntity = {
        id: '123',
        address: '123',
        createdAt: new Date(),
      };
      jest.spyOn(userService, 'getUserById').mockResolvedValueOnce(currentUser);

      const userSummary: UserSummary = {
        id: currentUser.id,
        address: currentUser.address,
      };

      const result = await controller.getUserInfo(userSummary);

      expect(result).toEqual(currentUser);
      expect(userService.getUserById).toHaveBeenCalledWith(userSummary.id);
      expect(telegramService.getUser).not.toHaveBeenCalled();
      expect(discordService.getUser).not.toHaveBeenCalled();
    });
  });

  describe('authorizeDiscordConnection', () => {
    it('should throw a NotFoundException if the user is not found', async () => {
      const query = { id: 'some-id' };
      const userInfo = mockUserEntity();
      jest.spyOn(discordService, 'getUser').mockResolvedValue(null);

      await expect(
        controller.authorizeDiscordConnection(query, userInfo),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update the user integration and return the user', async () => {
      const query = { id: 'some-id' };
      const userInfo = mockUserEntity();
      const discordUser = mockDiscordUser();
      const user = { ...userInfo, integration: { discord: null } };
      jest.spyOn(discordService, 'getUser').mockResolvedValue(discordUser);
      jest.spyOn(userService, 'getUserById').mockResolvedValue(user);
      jest.spyOn(userService, 'updateUserIntegration').mockResolvedValue(null);

      const result = await controller.authorizeDiscordConnection(
        query,
        userInfo,
      );

      expect(userService.getUserById).toHaveBeenCalledWith(userInfo.id);
      expect(userService.updateUserIntegration).toHaveBeenCalledWith(
        userInfo.id,
        {
          ...user.integration,
          discord: discordUser,
        },
      );
      expect(result).toEqual(user);
    });
  });

  describe('authorizeTelegramConnection', () => {
    it('should throw a NotFoundException if the user is not found', async () => {
      const query = { id: 'some-id' };
      const userInfo = mockUserEntity();
      jest.spyOn(telegramService, 'getUser').mockResolvedValue(null);

      await expect(
        controller.authorizeTelegramConnection(query, userInfo),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update the user integration and return the user', async () => {
      const query = { id: 'some-id' };
      const userInfo = mockUserEntity();
      const telegramUser = mockTelegramUser();
      const user = { ...userInfo, integration: { discord: null } };
      jest.spyOn(telegramService, 'getUser').mockResolvedValue(telegramUser);
      jest.spyOn(userService, 'getUserById').mockResolvedValue(user);
      jest.spyOn(userService, 'updateUserIntegration').mockResolvedValue(null);

      const result = await controller.authorizeTelegramConnection(
        query,
        userInfo,
      );

      expect(userService.getUserById).toHaveBeenCalledWith(userInfo.id);
      expect(userService.updateUserIntegration).toHaveBeenCalledWith(
        userInfo.id,
        {
          ...user.integration,
          telegram: telegramUser,
        },
      );
      expect(result).toEqual(user);
    });
  });

  describe('deleteTelegramConnection', () => {
    it('should delete the Telegram connection for a user', async () => {
      const userInfo = mockUserEntity();
      const integration = { telegram: mockTelegramUser() };
      const expectedIntegration = { telegram: null };
      jest
        .spyOn(userService, 'getUserById')
        .mockResolvedValue({ ...userInfo, integration });

      await controller.deleteTelegramConnection(userInfo);

      expect(userService.getUserById).toHaveBeenCalledWith(userInfo.id);
      expect(userService.updateUserIntegration).toHaveBeenCalledWith(
        userInfo.id,
        expectedIntegration,
      );
    });
  });

  describe('deleteDiscordConnection', () => {
    it('should delete the Telegram connection for a user', async () => {
      const userInfo = mockUserEntity();
      const integration = { discord: mockDiscordUser() };
      const expectedIntegration = { discord: null };
      jest
        .spyOn(userService, 'getUserById')
        .mockResolvedValue({ ...userInfo, integration });

      await controller.deleteDiscordConnection(userInfo);

      expect(userService.getUserById).toHaveBeenCalledWith(userInfo.id);
      expect(userService.updateUserIntegration).toHaveBeenCalledWith(
        userInfo.id,
        expectedIntegration,
      );
    });
  });
});
