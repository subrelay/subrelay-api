import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { UserModule } from '../src/user/user.module';
import { TelegramService } from '../src/telegram/telegram.service';
import { DiscordService } from '../src/discord/discord.service';
import { Repository } from 'typeorm';
import { UserEntity } from '../src/user/user.entity';
import 'dotenv/config';
import {
  mockDiscordUser,
  mockTelegramUser,
  mockUserEntity,
} from './mock-data.util';
import { cliOrmConfig } from './test-ormconfig';

describe('User', () => {
  let app: INestApplication;
  const telegramService = { getUser: jest.fn() };
  const discordService = { getUser: jest.fn() };
  let userRepository: Repository<UserEntity>;
  const user = mockUserEntity();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        UserModule,
        TypeOrmModule.forRoot(cliOrmConfig),
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
      req.user = {
        id: user.id,
        address: user.address,
      };
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
          expect(res.body.integration).toBe(null);
        });
    });
  });

  describe('GET user/connections/discord', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it(`Update nonexistence discord connection`, () => {
      jest.spyOn(discordService, 'getUser').mockImplementation(() => null);

      return request(app.getHttpServer())
        .get('/user/connections/discord')
        .query({ id: 'invalidConnectionId' })
        .expect(404);
    });

    it(`Update discord connection`, () => {
      const discordUser = mockDiscordUser();
      jest
        .spyOn(discordService, 'getUser')
        .mockImplementation(() => discordUser);

      const queryParams = { id: 'discordId' };
      return request(app.getHttpServer())
        .get('/user/connections/discord')
        .query(queryParams)
        .expect(200)
        .then((res) => {
          expect(res.body.id).toEqual(user.id);
          expect(res.body.address).toEqual(user.address);
          expect(res.body.integration.discord).toEqual(discordUser);
        });
    });
  });

  describe('GET user/connections/telegram', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it(`Update nonexistence telegram connection`, () => {
      jest.spyOn(telegramService, 'getUser').mockImplementation(() => null);

      return request(app.getHttpServer())
        .get('/user/connections/telegram')
        .query({ id: 'invalidConnectionId' })
        .expect(404);
    });

    it(`Update telegram connection`, () => {
      const telegramUser = mockTelegramUser();
      jest
        .spyOn(telegramService, 'getUser')
        .mockImplementation(() => telegramUser);
      const queryParams = { id: 'telegramId' };

      return request(app.getHttpServer())
        .get('/user/connections/telegram')
        .query(queryParams)
        .expect(200)
        .then((res) => {
          expect(res.body.id).toEqual(user.id);
          expect(res.body.address).toEqual(user.address);
          expect(res.body.integration.telegram).toEqual(telegramUser);
        });
    });
  });

  describe('DELETE user/connections/discord', () => {
    it(`Delete discord connection`, async () => {
      await userRepository.update(
        { id: user.id },
        { integration: { telegram: null, discord: mockDiscordUser() } },
      );

      await request(app.getHttpServer())
        .delete('/user/connections/discord')
        .expect(200);

      return request(app.getHttpServer())
        .get('/user/info')
        .expect(200)
        .then((res) => {
          expect(res.body.id).toEqual(user.id);
          expect(res.body.integration.discord).toBe(null);
        });
    });
  });

  describe('DELETE user/connections/telegram', () => {
    it(`Delete telegram connection`, async () => {
      await userRepository.update(
        { id: user.id },
        { integration: { discord: null, telegram: mockTelegramUser() } },
      );

      await request(app.getHttpServer())
        .delete('/user/connections/telegram')
        .expect(200);

      return request(app.getHttpServer())
        .get('/user/info')
        .expect(200)
        .then((res) => {
          expect(res.body.id).toEqual(user.id);
          expect(res.body.integration.telegram).toBe(null);
        });
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
