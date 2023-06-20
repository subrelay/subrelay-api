import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserEntity } from './user.entity';
import { UserSummary } from './user.dto';
import { TelegramService } from '../telegram/telegram.service';
import { DiscordService } from '../discord/discord.service';
import { mockDiscordUser, mockTelegramUser } from '../../test/mock-data.util';
import { ModuleRef } from '@nestjs/core';

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
          },
        },
        {
          provide: ModuleRef,
          useValue: {
            get: () => ({
              getUser: jest.fn(),
            }),
          },
        },
        // any other dependencies
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    controller.onModuleInit();
    userService = module.get<UserService>(UserService);
    telegramService = module.get<TelegramService>(TelegramService);
    discordService = module.get<DiscordService>(DiscordService);
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
  });
});
