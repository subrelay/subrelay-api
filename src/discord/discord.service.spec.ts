import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { DiscordService } from './discord.service';
import { Client, GatewayIntentBits } from 'discord.js';
import { InjectDiscordClient } from '@discord-nestjs/core';

jest.mock('@discord-nestjs/core', () => ({
  InjectDiscordClient: (item: any) => {
    return (target, propertyKey, descriptor) => {
      return undefined;
    };
  },
}));

describe('DiscordService', () => {
  let service: DiscordService;
  let client = {
    users: {
      send: jest.fn(),
      fetch: jest.fn(),
    },
  };
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        DiscordService,
        {
          provide: Client,
          useValue: client,
        },
      ],
    }).compile();

    service = moduleRef.get<DiscordService>(DiscordService);
  });

  describe('sendDirectMessage', () => {
    it('should call discordClient.users.send with the correct arguments', async () => {
      const chatId = '123';
      const message = 'Hello, world!';

      await service.sendDirectMessage(chatId, message);

      expect(client.users.send).toHaveBeenCalledWith(chatId, {
        embeds: [
          {
            color: 0,
            description: message,
          },
        ],
      });
    });
  });

  describe('getUser', () => {
    it('should return null if the userId is empty', async () => {
      const result = await service.getUser('');

      expect(result).toBeNull();
    });

    it('should call discordClient.users.fetch with the correct argument', async () => {
      const userId = '456';
      const user = {
        id: userId,
        username: 'testuser#1234',
        avatarURL: jest.fn(),
      };
      client.users.fetch.mockResolvedValueOnce(user);

      await service.getUser(userId);

      expect(client.users.fetch).toHaveBeenCalledWith(userId);
    });

    it('should return the user object if found', async () => {
      const userId = '789';
      const user = {
        id: userId,
        username: 'testuser',
        discriminator: '5678',
        avatarURL: jest.fn(),
      };
      client.users.fetch.mockResolvedValueOnce(user);

      const result = await service.getUser(userId);

      expect(result).toEqual({
        id: userId,
        username: 'testuser#5678',
        avatar: user.avatarURL(),
      });
    });

    it('should return null if the user is not found', async () => {
      const userId = '999';
      jest.spyOn(client.users, 'fetch').mockResolvedValueOnce(null);

      const result = await service.getUser(userId);

      expect(result).toBeNull();
    });
  });
});
