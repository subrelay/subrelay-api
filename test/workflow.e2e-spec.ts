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
import { InternalServerExceptionsFilter } from '../src/common/internal-server-error.filter';
import { APP_FILTER } from '@nestjs/core';
import {
  mockDiscordUser,
  mockTelegramUser,
  mockUserEntity,
} from './mock-data.util';
import { UserService } from '../src/user/user.service';
import { ulid } from 'ulid';
import { WorkflowModule } from '../src/workflow/workflow.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WorkflowEntity } from '../src/workflow/entity/workflow.entity';

describe('Task', () => {
  let app: INestApplication;
  const telegramService = {
    getUser: jest.fn(),
    sendDirectMessage: jest.fn(),
  };
  const discordService = {
    getUser: jest.fn(),
    sendDirectMessage: jest.fn(),
    getChatInfo: jest.fn(),
  };
  const webhookService = {
    sendMessage: jest.fn(),
    generateSignatureHeader: jest.fn(),
  };
  const emailService = {
    sendEmails: jest.fn(),
    sendDirectMessage: jest.fn(),
    getChatInfo: jest.fn(),
  };
  let event: EventEntity;
  let workflow;
  let userRepository: Repository<UserEntity>;
  let workflowRepository: Repository<WorkflowEntity>;

  const user = mockUserEntity();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
        WorkflowModule,
        TypeOrmModule.forRoot(ormConfig),
        TypeOrmModule.forFeature([EventEntity, UserEntity]),
      ],
      providers: [
        ConfigService,
        EventService,
        SubstrateService,
        UserService,
        {
          provide: APP_FILTER,
          useClass: InternalServerExceptionsFilter,
        },
      ],
    })
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
      req.user = {
        id: user.id,
        address: user.address,
      };
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

    workflowRepository = moduleRef.get(getRepositoryToken(WorkflowEntity));
    userRepository = moduleRef.get(getRepositoryToken(UserEntity));
    const eventRepository: Repository<EventEntity> = moduleRef.get(
      getRepositoryToken(EventEntity),
    );

    await userRepository.save([user]);
    event = (await eventRepository.find())[0];
  });

  describe('POST /workflows', () => {
    describe('Failed to create workflow', () => {
      it(`Nonexistent event`, () => {
        const input = {
          name: ulid(),
          tasks: [
            {
              name: 'trigger',
              type: 'trigger',
              dependOnName: null,
              config: {
                eventId: ulid(),
              },
            },
            {
              name: 'webhook',
              type: 'webhook',
              dependOnName: 'trigger',
              config: {
                url: 'https://example.com',
              },
            },
          ],
        };
        return request(app.getHttpServer())
          .post('/workflows')
          .send(input)
          .expect(400);
      });

      it(`Invalid input`, () => {
        const input = {
          name: ulid(),
          tasks: [
            {
              name: 'trigger',
              type: 'trigger',
              dependOnName: null,
              config: {
                eventId: event.id,
              },
            },
          ],
        };
        return request(app.getHttpServer())
          .post('/workflows')
          .send(input)
          .expect(400);
      });
    });

    it(`Webhook workflow`, () => {
      const input = {
        name: ulid(),
        tasks: [
          {
            name: 'trigger',
            type: 'trigger',
            dependOnName: null,
            config: {
              eventId: event.id,
            },
          },
          {
            name: 'webhook',
            type: 'webhook',
            dependOnName: 'trigger',
            config: {
              url: 'https://example.com',
            },
          },
        ],
      };
      return request(app.getHttpServer())
        .post('/workflows')
        .send(input)
        .expect(201)
        .then((res) => {
          expect(res.body.name).toEqual(input.name);
          expect(res.body.status).toEqual('running');
          workflow = res.body;
        });
    });

    describe(`Email workflow`, () => {
      it('Success create workflow', () => {
        const input = {
          name: ulid(),
          tasks: [
            {
              name: 'trigger',
              type: 'trigger',
              dependOnName: null,
              config: {
                eventId: event.id,
              },
            },
            {
              name: 'email',
              type: 'email',
              dependOnName: 'trigger',
              config: {
                addresses: ['example@gmail.com'],
                subjectTemplate: 'Your event has been triggered',
                bodyTemplate: ' has been sent to  DOT',
              },
            },
          ],
        };
        return request(app.getHttpServer())
          .post('/workflows')
          .send(input)
          .expect(201)
          .then((res) => {
            expect(res.body.name).toEqual(input.name);
            expect(res.body.status).toEqual('running');
            workflow = res.body;
          });
      });
    });

    describe('Discord workflow', () => {
      const input = {
        name: ulid(),
        tasks: [
          {
            name: 'trigger',
            type: 'trigger',
            dependOnName: null,
            config: {
              eventId: '',
            },
          },
          {
            name: 'discord',
            type: 'discord',
            dependOnName: 'trigger',
            config: {
              messageTemplate: 'Hello 😃💁',
            },
          },
        ],
      };

      it(`User does not set up discord connection yet`, () => {
        input.tasks[0].config.eventId = event.id;

        return request(app.getHttpServer())
          .post('/workflows')
          .send(input)
          .expect(400);
      });

      it(`Success create workflow`, async () => {
        input.tasks[0].config.eventId = event.id;

        await userRepository.update(
          { id: user.id },
          {
            integration: {
              discord: mockDiscordUser(),
              telegram: null,
            },
          },
        );

        return request(app.getHttpServer())
          .post('/workflows')
          .send(input)
          .expect(201)
          .then((res) => {
            expect(res.body.name).toEqual(input.name);
          });
      });
    });

    describe('Telegram workflow', () => {
      const input = {
        name: ulid(),
        tasks: [
          {
            name: 'trigger',
            type: 'trigger',
            dependOnName: null,
            config: {
              eventId: '',
            },
          },
          {
            name: 'telegram',
            type: 'telegram',
            dependOnName: 'trigger',
            config: {
              messageTemplate: 'Hello 😃💁',
            },
          },
        ],
      };

      it(`User does not set up telegram connection yet`, () => {
        input.tasks[0].config.eventId = event.id;

        return request(app.getHttpServer())
          .post('/workflows')
          .send(input)
          .expect(400);
      });

      it(`Success create workflow`, async () => {
        input.tasks[0].config.eventId = event.id;

        await userRepository.update(
          { id: user.id },
          {
            integration: {
              discord: null,
              telegram: mockTelegramUser(),
            },
          },
        );

        return request(app.getHttpServer())
          .post('/workflows')
          .send(input)
          .expect(201);
      });
    });
  });

  describe('GET /workflows', () => {
    it(`Get workflows`, () => {
      return request(app.getHttpServer())
        .get('/workflows')
        .expect(200)
        .then((res) => {
          expect(res.body.total).toBe(4);
          expect(res.body.workflows).toHaveLength(4);
        });
    });
  });

  describe('GET /workflow/{workflow_id}', () => {
    it(`Get a nonexistence workflow`, () => {
      return request(app.getHttpServer())
        .get(`/workflows/${ulid()}`)
        .expect(404);
    });

    it(`Get an existing workflow`, () => {
      return request(app.getHttpServer())
        .get(`/workflows/${workflow.id}`)
        .expect(200)
        .then((res) => {
          expect(res.body).toEqual(workflow);
        });
    });
  });

  describe('PUT /workflows', () => {
    it(`Update a nonexistence workflow`, () => {
      return request(app.getHttpServer())
        .get(`/workflows/${ulid()}`)
        .expect(404);
    });

    it(`Update an existing workflow`, () => {
      const input = {
        status: 'pausing',
        name: ulid(),
      };
      return request(app.getHttpServer())
        .patch(`/workflows/${workflow.id}`)
        .send(input)
        .expect(204)
        .then(() => {
          return request(app.getHttpServer())
            .get(`/workflows/${workflow.id}`)
            .expect(200)
            .then((res) => {
              expect(res.body.name).toBe(input.name);
              expect(res.body.status).toBe(input.status);
            });
        });
    });
  });

  describe('DELETE /workflow/{workflow_id}', () => {
    it(`Delete a nonexistence workflow`, () => {
      return request(app.getHttpServer())
        .get(`/workflows/${ulid()}`)
        .expect(404);
    });

    it(`Delete an existing workflow`, () => {
      return request(app.getHttpServer())
        .delete(`/workflows/${workflow.id}`)
        .expect(204);
    });
  });

  afterAll(async () => {
    await workflowRepository.delete({ userId: user.id });
    await app.close();
  });
});
