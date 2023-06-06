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
import { mockDiscordUser, mockTelegramUser, mockUser } from './mock-data';

describe('User', () => {
  let app: INestApplication;
  let telegramService = { getUser: jest.fn() };
  let discordService = { getUser: jest.fn() };
  let userRepository: Repository<UserEntity>;
  let user = mockUser();

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

  describe('GET user/connections/discord', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it(`Update nonexistence discord connection`, () => {
      jest.spyOn(discordService, 'getUser').mockImplementation((id) => null);

      return request(app.getHttpServer())
        .get('/user/connections/discord')
        .query({ id: 'invalidConnectionId' })
        .expect(404);
    });

    it(`Update discord connection`, () => {
      const discordUser = mockDiscordUser();
      jest
        .spyOn(discordService, 'getUser')
        .mockImplementation((id) => discordUser);

      const queryParams = { id: 'discordId' };
      request(app.getHttpServer())
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

    // it(`Update nonexistence telegram connection`, () => {
    //   jest.spyOn(telegramService, 'getUser').mockImplementation((id) => null);

    //   return request(app.getHttpServer())
    //     .get('/user/connections/telegram')
    //     .query({ id: 'invalidConnectionId' })
    //     .expect(404);
    // });

    it(`Update telegram connection`, () => {
      const telegramUser = mockTelegramUser();
      jest
        .spyOn(telegramService, 'getUser')
        .mockImplementation(() => telegramUser);
      const queryParams = { id: 'telegramId' };

      request(app.getHttpServer())
        .get('/user/connections/telegram')
        .query(queryParams)
        .expect(200)
        .then((res) => {
          expect(res.body.id).toEqual(user.id);
          expect(res.body.address).toEqual(user.address);
          expect(res.body.integration.discord).toEqual(telegramUser);
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
