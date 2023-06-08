import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import ormConfig from '../src/config/ormconfig';
import { TelegramService } from '../src/telegram/telegram.service';
import { DiscordService } from '../src/discord/discord.service';
import { Repository } from 'typeorm';
import { UserEntity } from '../src/user/user.entity';
import 'dotenv/config';
import { EventService } from '../src/event/event.service';
import { WebhookService } from '../src/webhook/webhook.service';
import { EmailService } from '../src/email/email.service';
import { SubstrateService } from '../src/substrate/substrate.service';
import { EventEntity } from '../src/event/event.entity';
import { TaskModule } from '../src/task/task.module';
import { InternalServerExceptionsFilter } from '../src/common/internal-server-error.filter';
import { APP_FILTER } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { mockDiscordUser, mockTelegramUser, mockUser } from './mock-data';
import { UserService } from '../src/user/user.service';

describe('Task', () => {
  let app: INestApplication;
  let telegramService = {
    getUser: jest.fn(),
    sendDirectMessage: jest.fn(),
  };
  let discordService = {
    getUser: jest.fn(),
    sendDirectMessage: jest.fn(),
    getChatInfo: jest.fn(),
  };
  let webhookService = {
    sendMessage: jest.fn(),
    generateSignatureHeader: jest.fn(),
  };
  let emailService = {
    sendEmails: jest.fn(),
    sendDirectMessage: jest.fn(),
    getChatInfo: jest.fn(),
  };
  let substrateService = {};
  let event: EventEntity;
  let userRepository: Repository<UserEntity>;

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
        UserService,
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

    userRepository = moduleRef.get(getRepositoryToken(UserEntity));
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

  describe('POST /tasks/run', () => {
    describe('Webhook task', () => {
      afterEach(() => {
        jest.resetAllMocks();
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
            expect(res.body).toEqual({
              status: 'success',
            });
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
            expect(res.body).toEqual({
              status: 'success',
            });
          });
      });
    });

    // Email
    describe('Email task', () => {
      afterEach(() => {
        jest.resetAllMocks();
      });

      it(`Failed with nonexistence event ID`, () => {
        const input = {
          type: 'email',
          config: {
            addresses: ['example@gmail.com'],
            subjectTemplate:
              '<p><b>Your event <b>has</b> been triggered</b></p>',
            bodyTemplate: ' has been sent to  DOT',
          },
          data: {
            eventId: 'FooAndBarId',
          },
        };
        return request(app.getHttpServer())
          .post('/tasks/run')
          .send(input)
          .expect(404);
      });

      it(`Failed with missing data`, () => {
        const input = {
          type: 'email',
          config: {
            addresses: ['example@gmail.com'],
            subjectTemplate:
              '<p><b>Your event <b>has</b> been triggered</b></p>',
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

      it(`Failed to send email`, () => {
        const errorMsg = 'Failed to send email';
        jest.spyOn(emailService, 'sendEmails').mockImplementation(() => {
          throw new Error(errorMsg);
        });

        const input = {
          type: 'email',
          config: {
            addresses: ['example@gmail.com'],
            subjectTemplate:
              '<p><b>Your event <b>has</b> been triggered</b></p>',
            bodyTemplate: ' has been sent to  DOT',
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

      it(`Success`, () => {
        jest.spyOn(emailService, 'sendEmails').mockImplementation(() => {});
        const input = {
          type: 'email',
          config: {
            addresses: ['example@gmail.com'],
            subjectTemplate:
              '<p><b>Your event <b>has</b> been triggered</b></p>',
            bodyTemplate: ' has been sent to  DOT',
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
              status: 'success',
            });
          });
      });
    });

    // Discord
    describe('Discord task', () => {
      afterEach(() => {
        jest.resetAllMocks();
      });

      it(`Failed with nonexistence event ID`, () => {
        const input = {
          type: 'discord',
          config: {
            messageTemplate:
              'Hello,\n\nHere is the summary of what happened in the event you are subscribing:\n\nChain: 8506ee1b-6821-4d38-b3ba-e935525c446a\n\nSample Data:\n\nVar1: ${event.success}',
          },
          data: {
            eventId: 'FooAndBar',
          },
        };
        return request(app.getHttpServer())
          .post('/tasks/run')
          .send(input)
          .expect(404);
      });

      it(`Failed with missing data`, () => {
        const input = {
          type: 'discord',
          config: {},
          data: {
            eventId: event.id,
          },
        };
        return request(app.getHttpServer())
          .post('/tasks/run')
          .send(input)
          .expect(400);
      });

      it(`Failed to send message to user that does not set up connection yet`, async () => {
        await userRepository.update({ id: user.id }, { integration: {} });

        const input = {
          type: 'discord',
          config: {
            messageTemplate:
              'Hello,\n\nHere is the summary of what happened in the event you are subscribing:\n\nChain: 8506ee1b-6821-4d38-b3ba-e935525c446a\n\nSample Data:\n\nVar1: ${event.success}',
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
                message: "Discord integration does't set up yet.",
              },
            });
          });
      });

      it(`Failed to send message to user`, async () => {
        const discordUser = mockDiscordUser();
        await userRepository.update(
          { id: user.id },
          { integration: { discord: discordUser } },
        );

        const errorMsg = 'Failed to send discord message';
        jest
          .spyOn(discordService, 'sendDirectMessage')
          .mockImplementation(() => {
            throw new Error(errorMsg);
          });

        const input = {
          type: 'discord',
          config: {
            messageTemplate:
              'Hello,\n\nHere is the summary of what happened in the event you are subscribing:\n\nChain: 8506ee1b-6821-4d38-b3ba-e935525c446a\n\nSample Data:\n\nVar1: ${event.success}',
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

      it(`Success`, async () => {
        const discordUser = mockDiscordUser();
        await userRepository.update(
          { id: user.id },
          { integration: { discord: discordUser } },
        );
        jest
          .spyOn(discordService, 'sendDirectMessage')
          .mockImplementation(() => {});
        const input = {
          type: 'discord',
          config: {
            messageTemplate:
              'Hello,\n\nHere is the summary of what happened in the event you are subscribing:\n\nChain: 8506ee1b-6821-4d38-b3ba-e935525c446a\n\nSample Data:\n\nVar1: ${event.success}',
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
              status: 'success',
            });
          });
      });
    });

    describe('Telegram task', () => {
      afterEach(() => {
        jest.resetAllMocks();
      });

      it(`Failed with nonexistence event ID`, () => {
        const input = {
          type: 'telegram',
          config: {
            messageTemplate:
              'Hello,\n\nHere is the summary of what happened in the event you are subscribing:\n\nChain: 8506ee1b-6821-4d38-b3ba-e935525c446a\n\nSample Data:\n\nVar1: ${event.success}',
          },
          data: {
            eventId: 'FooAndBar',
          },
        };
        return request(app.getHttpServer())
          .post('/tasks/run')
          .send(input)
          .expect(404);
      });

      it(`Failed with missing data`, () => {
        const input = {
          type: 'telegram',
          data: {
            eventId: event.id,
          },
        };
        return request(app.getHttpServer())
          .post('/tasks/run')
          .send(input)
          .expect(400);
      });

      it(`Failed to send message to user that does not set up connection yet`, async () => {
        await userRepository.update({ id: user.id }, { integration: {} });

        const input = {
          type: 'telegram',
          config: {
            messageTemplate:
              'Hello,\n\nHere is the summary of what happened in the event you are subscribing:\n\nChain: 8506ee1b-6821-4d38-b3ba-e935525c446a\n\nSample Data:\n\nVar1: ${event.success}',
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
                message: "Telegram integration does't set up yet.",
              },
            });
          });
      });

      it(`Failed to send message to user`, async () => {
        const telegramUser = mockTelegramUser();
        await userRepository.update(
          { id: user.id },
          { integration: { telegram: telegramUser } },
        );

        const errorMsg = 'Failed to send telegram message';
        const spy = jest
          .spyOn(telegramService, 'sendDirectMessage')
          .mockImplementation(() => {
            throw new Error(errorMsg);
          });

        const input = {
          type: 'telegram',
          config: {
            messageTemplate:
              'Hello,\n\nHere is the summary of what happened in the event you are subscribing:\n\nChain: 8506ee1b-6821-4d38-b3ba-e935525c446a\n\nSample Data:\n\nVar1: ${event.success}',
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

            expect(spy).toHaveBeenCalled();
          });
      });

      it(`Success`, async () => {
        const telegramUser = mockTelegramUser();
        await userRepository.update(
          { id: user.id },
          { integration: { telegram: telegramUser } },
        );

        jest
          .spyOn(telegramService, 'sendDirectMessage')
          .mockImplementation(() => {});
        const input = {
          type: 'telegram',
          config: {
            messageTemplate:
              'Hello,\n\nHere is the summary of what happened in the event you are subscribing:\n\nChain: 8506ee1b-6821-4d38-b3ba-e935525c446a\n\nSample Data:\n\nVar1: ${event.success}',
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
              status: 'success',
            });
          });
      });
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
