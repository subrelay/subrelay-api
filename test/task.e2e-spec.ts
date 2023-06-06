import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
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
import { WebhookService } from '../src/webhook/webhook.service';
import { EmailService } from '../src/email/email.service';
import { SubstrateService } from '../src/substrate/substrate.service';
import { EventEntity } from '../src/event/event.entity';
import { TaskModule } from '../src/task/task.module';
import { InternalServerExceptionsFilter } from '../src/common/internal-server-error.filter';
import { APP_FILTER } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { mockUser } from './mock-data';

describe('Task', () => {
  let app: INestApplication;
  let telegramService = { getUser: jest.fn() };
  let discordService = { getUser: jest.fn() };
  let webhookService = {
    sendMessage: jest.fn(),
    generateSignatureHeader: jest.fn(),
  };
  let emailService = {};
  let substrateService = {};
  let event: EventEntity;

  const user = mockUser();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        TaskModule,
        TypeOrmModule.forRoot(ormConfig),
        TypeOrmModule.forFeature([EventEntity, UserEntity]),
      ],
      providers: [
        TelegramService,
        DiscordService,
        EventService,
        WebhookService,
        EmailService,
        SubstrateService,
        {
          provide: APP_FILTER,
          useClass: InternalServerExceptionsFilter,
        },
        ConfigService,
      ],
    })
      .overrideProvider(SubstrateService)
      .useValue(substrateService)
      .overrideProvider(TelegramService)
      .useValue(telegramService)
      .overrideProvider(DiscordService)
      .useValue(discordService)
      .overrideProvider(WebhookService)
      .useValue(webhookService)
      .overrideProvider(EmailService)
      .useValue(emailService)
      .compile();

    app = moduleRef.createNestApplication();
    app.use((req, res, next) => {
      req.user = user;
      next();
    });
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        transformOptions: { enableImplicitConversion: true },
        forbidUnknownValues: false,
      }),
    );
    await app.init();

    const userRepository = moduleRef.get(getRepositoryToken(UserEntity));
    const eventRepository: Repository<EventEntity> = moduleRef.get(
      getRepositoryToken(EventEntity),
    );
    await userRepository.save([user]);
    event = (await eventRepository.find())[0];
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
        .query({ eventId: event.id })
        .expect(200);
    });
  });

  describe('GET /tasks/custom-message/fields', () => {
    it(`Get supported fields for filter task`, () => {
      return request(app.getHttpServer())
        .get('/tasks/custom-message/fields')
        .query({ eventId: event.id })
        .expect(200);
    });
  });

  /* Webhook task
    1. Do not have secret
    2. Invalid Url
    2. Have secret -> verify header
   */

  describe('POST /tasks/run', () => {
    describe('Webhook task', () => {
      afterEach(() => {
        jest.restoreAllMocks();
      });

      it(`Failed with nonexistence event ID`, () => {
        const input = {
          type: 'webhook',
          config: {
            url: 'https://webhook.site/ccecf6d1-bdb8-4ba2-86f5-e1d9205f9cd7',
          },
          data: {
            eventId: 'exampleID',
          },
        };
        return request(app.getHttpServer())
          .post('/tasks/run')
          .send(input)
          .expect(404);
      });

      it(`Failed with invalid webhook URL`, () => {
        const input = {
          type: 'webhook',
          config: {
            url: 'https://webhook',
          },
          data: {
            eventId: event.id,
          },
        };
        return request(app.getHttpServer())
          .post('/tasks/run')
          .send(input)
          .expect(400);
      });

      it(`Failed to send request to webhook URL`, () => {
        const errorMsg = 'Failed to send request';
        jest.spyOn(webhookService, 'sendMessage').mockImplementation(() => {
          throw new Error(errorMsg);
        });

        const input = {
          type: 'webhook',
          config: {
            url: 'https://webhook.com',
          },
          data: {
            eventId: event.id,
          },
        };
        return request(app.getHttpServer())
          .post('/tasks/run')
          .send(input)
          .expect(200)
          .then((res) => {
            expect(res.body).toEqual({
              status: 'failed',
              error: {
                message: errorMsg,
              },
            });
          });
      });

      it(`Success without secret`, () => {
        jest.spyOn(webhookService, 'sendMessage').mockImplementation(() => {});
        const input = {
          type: 'webhook',
          config: {
            url: 'https://webhook.site/ccecf6d1-bdb8-4ba2-86f5-e1d9205f9cd7',
          },
          data: {
            eventId: event.id,
          },
        };
        return request(app.getHttpServer())
          .post('/tasks/run')
          .send(input)
          .expect(200)
          .then((res) => {
            expect(res.headers['x-hub-signature-256']).toBeUndefined();
          });
      });

      it(`Success with secret`, () => {
        jest.spyOn(webhookService, 'sendMessage').mockImplementation(() => {});
        const input = {
          type: 'webhook',
          config: {
            url: 'https://webhook.site/ccecf6d1-bdb8-4ba2-86f5-e1d9205f9cd7',
            secret: 'fooandbar',
          },
          data: {
            eventId: event.id,
          },
        };
        return request(app.getHttpServer())
          .post('/tasks/run')
          .send(input)
          .expect(200)
          .then((res) => {
            expect(res.headers['x-hub-signature-256']).not.toBe(null);
          });
      });
    });
  });

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
