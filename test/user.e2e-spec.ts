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

describe('User', () => {
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
      imports: [
        UserModule,
        TypeOrmModule.forRoot(ormConfig),
        TypeOrmModule.forFeature([UserEntity]),
      ],
      providers: [TelegramService, DiscordService],
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

  describe('GET /user/info', () => {
    it(`Get user info`, () => {
      return request(app.getHttpServer())
        .get('/user/info')
        .expect(200)
        .then((res) => {
          expect(res.body.id).toEqual(user.id);
          expect(res.body.address).toEqual(user.address);
          expect(res.body.integration).toEqual(user.integration);
        });
    });
  });

  describe('GET /connections/discord', () => {
    it(`Update nonexistence discord connection`, () => {
      return request(app.getHttpServer())
        .get('/user/connections/discord')
        .query({ id: invalidConnectionId })
        .expect(404);
    });

    it(`Update discord connection`, () => {
      const queryParams = { id: 'discordId' };
      request(app.getHttpServer())
        .get('/user/connections/discord')
        .query(queryParams)
        .expect(200);

      request(app.getHttpServer())
        .get('/user/info')
        .expect(200)
        .then((res) => {
          expect(res.body.id).toEqual(user.id);
          expect(res.body.address).toEqual(user.address);
          expect(res.body.integration.discord).toEqual(
            mockDiscordUser(queryParams.id),
          );
        });
    });
  });

  describe('DELETE /connections/discord', () => {
    it(`Delete discord connection`, () => {
      request(app.getHttpServer())
        .delete('/user/connections/discord')
        .expect(204);

      request(app.getHttpServer())
        .get('/user/info')
        .expect(200)
        .then((res) => {
          expect(res.body.id).toEqual(user.id);
          expect(res.body.integration.discord).toBe(undefined);
        });
    });
  });

  describe('GET /connections/telegram', () => {
    it(`Update nonexistence telegram connection`, () => {
      return request(app.getHttpServer())
        .get('/user/connections/telegram')
        .query({ id: invalidConnectionId })
        .expect(404);
    });

    it(`Update telegram connection`, () => {
      const queryParams = { id: 'telegramId' };
      request(app.getHttpServer())
        .get('/user/connections/telegram')
        .query(queryParams)
        .expect(200);

      request(app.getHttpServer())
        .get('/user/info')
        .expect(200)
        .then((res) => {
          expect(res.body.id).toEqual(user.id);
          expect(res.body.address).toEqual(user.address);
          expect(res.body.integration.telegram).toEqual(
            mockTelegramUser(queryParams.id),
          );
        });
    });
  });

  describe('DELETE /connections/telegram', () => {
    it(`Delete telegram connection`, () => {
      request(app.getHttpServer())
        .delete('/user/connections/telegram')
        .expect(204);

      request(app.getHttpServer())
        .get('/user/info')
        .expect(200)
        .then((res) => {
          expect(res.body.id).toEqual(user.id);
          expect(res.body.integration.telegram).toBe(undefined);
        });
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
