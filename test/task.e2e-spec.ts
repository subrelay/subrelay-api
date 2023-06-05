import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import ormConfig from '../src/config/ormconfig';
import { ulid } from 'ulid';
import { UserModule } from '../src/user/user.module';
import { TelegramService } from '../src/telegram/telegram.service';
import { DiscordService } from '../src/discord/discord.service';
import { Repository } from 'typeorm';
import { UserEntity } from '../src/user/user.entity';
import 'dotenv/config';
import { ChainModule } from '../src/chain/chain.module';
import { EventService } from '../src/event/event.service';

describe('Task', () => {
  let app: INestApplication;
  let telegramService = {
    getUser: (telegramId) => telegramId && mockTelegramUser(telegramId),
  };
  let discordService = {
    getUser: (discordId) => discordId && mockDiscordUser(discordId),
  };
  let userRepository: Repository<UserEntity>;

  const invalidConnectionId = 'invalidId';
  let mockDiscordUser = (discordId) => {
    if (discordId === invalidConnectionId) {
      return null;
    }

    return {
      id: discordId,
      username: 'Discord user',
      avatar: 'https://example.com/file_1.jpg',
    };
  };

  let mockTelegramUser = (telegramId) => {
    if (telegramId === invalidConnectionId) {
      return null;
    }

    return {
      id: telegramId,
      username: 'Telegram user',
      avatar: 'https://example.com/file_1.jpg',
    };
  };

  let user = {
    id: ulid(),
    address: '5Ea3dne7kDTMvSnYCFTFrZsLNputsrg35ZQCaHwuviSYMa3e',
    integration: {},
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ChainModule, TypeOrmModule.forRoot(ormConfig)],
      providers: [TelegramService, DiscordService, EventService],
    })
      .overrideProvider(TelegramService)
      .useValue(telegramService)
      .overrideProvider(DiscordService)
      .useValue(discordService)
      .compile();

    app = moduleRef.createNestApplication();
    app.use((req, res, next) => {
      req.user = user;
      next();
    });
    await app.init();

    userRepository = moduleRef.get(getRepositoryToken(UserEntity));
    await userRepository.save([user]);
  });

  describe('GET /tasks/filter/operators', () => {
    it(`Get operators for filter task`, () => {
      return request(app.getHttpServer())
        .get('/tasks/filter/operators')
        .expect(200);
    });
  });

  describe('GET /tasks/filter/fields', () => {
    it(`Get supported fields for filter task`, () => {
      return request(app.getHttpServer())
        .get('/tasks/filter/fields')
        .expect(200);
    });
  });

  describe('GET /tasks/custom-message/fields', () => {
    it(`Get supported fields for filter task`, () => {
      return request(app.getHttpServer())
        .get('/tasks/custom-message/fields')
        .expect(200);
    });
  });

  /* Webhook task
    1. Do not have secret
    2. Invalid Url
    2. Have secret -> verify header
   */

  /* Email task
    1. Invalid email address
    2. Successfully
    3. Invalid config
   */

  /* Discord task
    1. Use does not have Discord connection
    2. Successfully
    3. Invalid config
   */

  /* Telegram task
    1. Use does not have Telegram connection
    2. Successfully
    3. Invalid config
   */

  afterAll(async () => {
    await app.close();
  });
});
