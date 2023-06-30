import { Test } from '@nestjs/testing';
import { TelegramService } from './telegram.service';
import { Telegraf } from 'telegraf';
import { mockTelegramUser } from '../../test/mock-data.util';
import { User } from 'telegraf/typings/core/types/typegram';

jest.mock('nestjs-telegraf', () => ({
  InjectBot: () => {
    return () => {
      return undefined;
    };
  },
}));

describe('TelegramService', () => {
  let service: TelegramService;
  const bot = {
    telegram: {
      sendMessage: jest.fn(),
      getChatMember: jest.fn(),
      getUserProfilePhotos: jest.fn(),
      getFileLink: jest.fn(),
    },
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        TelegramService,
        {
          provide: Telegraf,
          useValue: bot,
        },
      ],
    }).compile();

    service = moduleRef.get<TelegramService>(TelegramService);
  });

  describe('sendDirectMessage', () => {
    it('should send a direct message', async () => {
      const chatId = 'CHAT_ID';
      const message = 'Hello, world!';

      jest.spyOn(service, 'validateChatId').mockResolvedValueOnce(undefined);
      const mockSendMessage = jest
        .spyOn(bot.telegram, 'sendMessage')
        .mockResolvedValueOnce(true);

      await service.sendDirectMessage(chatId, message);

      expect(mockSendMessage).toHaveBeenCalledWith(chatId, message, {
        parse_mode: 'HTML',
      });
    });

    it('should throw an error if chat is not found', async () => {
      const chatId = 'INVALID_CHAT_ID';
      const message = 'Hello, world!';

      const telegramBotMock = jest.spyOn(bot.telegram, 'sendMessage');
      telegramBotMock.mockImplementationOnce(() => Promise.reject('Error'));

      await expect(
        service.sendDirectMessage(chatId, message),
      ).rejects.toThrowError('Chat not found.');
    });
  });

  describe('getChatInfo', () => {
    it('should return chat info', async () => {
      const chatId = 'CHAT_ID';

      const telegramBotMock = jest.spyOn(bot.telegram, 'getChatMember');
      telegramBotMock.mockImplementationOnce(() =>
        Promise.resolve({ user: {} }),
      );

      const result = await service.getChatInfo(chatId);

      expect(telegramBotMock).toHaveBeenCalledWith(chatId, parseInt(chatId));
      expect(result).toBeDefined();
    });

    it('should return null for invalid chat id', async () => {
      const chatId = '';

      const result = await service.getChatInfo(chatId);

      expect(result).toBeNull();
    });

    it('should return null if chat is not found', async () => {
      const chatId = 'INVALID_CHAT_ID';

      const telegramBotMock = jest.spyOn(bot.telegram, 'getChatMember');
      telegramBotMock.mockImplementationOnce(() => Promise.reject('Error'));

      const result = await service.getChatInfo(chatId);

      expect(result).toBeNull();
    });
  });

  describe('getUser', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should return user info', async () => {
      const user = mockTelegramUser();

      const mockGetChatInfo = jest
        .spyOn(service, 'getChatInfo')
        .mockResolvedValueOnce(user as any as User);
      const mockGetUserProfilePhotos = jest
        .spyOn(bot.telegram, 'getUserProfilePhotos')
        .mockResolvedValueOnce({
          total_count: 1,
          photos: [[{ file_id: '123' }]],
        });
      const mockGetFileLink = jest
        .spyOn(bot.telegram, 'getFileLink')
        .mockResolvedValueOnce({ href: 'https://file-link.com' });

      const result = await service.getUser(user.id);

      expect(mockGetChatInfo).toHaveBeenCalledWith(user.id);
      expect(mockGetUserProfilePhotos).toHaveBeenCalledWith(parseInt(user.id));
      expect(mockGetFileLink).toHaveBeenCalledWith('123');
      expect(result).toEqual({
        id: user.id,
        username: user.username,
        avatar: 'https://file-link.com',
      });
    });

    it('should return null for invalid user id', async () => {
      const userId = '';

      const result = await service.getUser(userId);

      expect(result).toBeNull();
    });

    it('should return null if user is not found', async () => {
      const userId = 'INVALID_USER_ID';

      const telegramBotMock = jest.spyOn(bot.telegram, 'getChatMember');
      telegramBotMock.mockImplementationOnce(() => Promise.reject('Error'));

      const result = await service.getUser(userId);

      expect(result).toBeNull();
    });

    it('should return avatar is null if user has no photos', async () => {
      const user = mockTelegramUser();

      jest
        .spyOn(service, 'getChatInfo')
        .mockResolvedValueOnce(user as any as User);

      const mockGetUserProfilePhotos = jest
        .spyOn(bot.telegram, 'getUserProfilePhotos')
        .mockResolvedValueOnce({
          total_count: 0,
        });

      const result = await service.getUser(user.id);
      expect(mockGetUserProfilePhotos).toHaveBeenCalledWith(parseInt(user.id));
      expect(bot.telegram.getFileLink).not.toHaveBeenCalled();
      expect(result).toEqual({
        id: user.id,
        username: user.username,
        avatar: undefined,
      });
    });

    it('should return avatar is null if user has no photo links', async () => {
      const user = mockTelegramUser();
      const mockGetChatInfo = jest
        .spyOn(service, 'getChatInfo')
        .mockResolvedValueOnce(user as any as User);
      const mockGetUserProfilePhotos = jest
        .spyOn(bot.telegram, 'getUserProfilePhotos')
        .mockResolvedValueOnce({
          total_count: 1,
          photos: [[{ file_id: '123' }]],
        });
      const mockGetFileLink = jest
        .spyOn(bot.telegram, 'getFileLink')
        .mockResolvedValueOnce(null);

      const result = await service.getUser(user.id);

      expect(mockGetChatInfo).toHaveBeenCalledWith(user.id);
      expect(mockGetUserProfilePhotos).toHaveBeenCalledWith(parseInt(user.id));
      expect(mockGetFileLink).toHaveBeenCalledWith('123');
      expect(result).toEqual({
        id: user.id,
        username: user.username,
        avatar: undefined,
      });
    });
  });
});
