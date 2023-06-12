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
import { mockUser } from './mock-data.util';
import { UserService } from '../src/user/user.service';
import { ChainEntity } from '../src/chain/chain.entity';
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

  const user = mockUser();

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
    await userRepository.save([user]);

    const eventRepository: Repository<EventEntity> = moduleRef.get(
      getRepositoryToken(EventEntity),
    );
    event = (await eventRepository.find())[0];

    workflowRepository = moduleRef.get(getRepositoryToken(WorkflowEntity));
  });

  describe('POST /workflows', () => {
    it(`Create webhook workflow`, () => {
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
          workflow = res.body;
        });
    });
  });

  describe('GET /workflows', () => {
    it(`Get workflows`, () => {
      return request(app.getHttpServer())
        .get('/workflows')
        .expect(200)
        .then((res) => {
          expect(res.body.total).toBe(1);
          expect(res.body.workflows).toHaveLength(1);
          expect(res.body.workflows[0].id).toEqual(workflow.id);
        });
    });
  });

  afterAll(async () => {
    await workflowRepository.delete({ userId: user.id });
    await app.close();
  });
});
