import { ulid } from 'ulid';

export function mockDiscordUser() {
  return {
    id: 'discordId',
    username: 'Discord user',
    avatar: 'https://example.com/file_1.jpg',
  };
}

export function mockTelegramUser() {
  return {
    id: 'telegramId',
    username: 'Telegram user',
    avatar: 'https://example.com/file_1.jpg',
  };
}

export function mockUser() {
  return {
    id: ulid(),
    address: '5Ea3dne7kDTMvSnYCFTFrZsLNputsrg35ZQCaHwuviSYMa3e',
    integration: {},
  };
}
