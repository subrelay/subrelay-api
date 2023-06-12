import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ChainModule } from '../src/chain/chain.module';
import { SubstrateService } from '../src/substrate/substrate.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import ormConfig from '../src/config/ormconfig';
import { ChainSummary } from '../src/chain/chain.dto';
import { ulid } from 'ulid';
import { EventEntity } from '../src/event/event.entity';
import { APP_FILTER } from '@nestjs/core';
import { InternalServerExceptionsFilter } from '../src/common/internal-server-error.filter';
import { ConfigService } from '@nestjs/config';

describe('Chain', () => {
  let app: INestApplication;
  let chains: ChainSummary[];
  let events: EventEntity[];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ChainModule, TypeOrmModule.forRoot(ormConfig)],
      providers: [
        SubstrateService,
        ConfigService,
        {
          provide: APP_FILTER,
          useClass: InternalServerExceptionsFilter,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();

    await app.init();
  });

  describe('GET /chains', () => {
    it(`Get all chains`, () => {
      return request(app.getHttpServer())
        .get('/chains')
        .expect(200)
        .then((data) => {
          chains = data.body;
        });
    });
  });

  describe('PUT /chains/{id}', () => {
    it(`Update chain successfully`, () => {
      const chainUuid = chains[0].uuid;
      const input = {
        name: ulid(),
        imageUrl: `https://${ulid()}.com/${ulid()}.png`,
      };
      return request(app.getHttpServer())
        .put(`/chains/${chainUuid}`)
        .send(input)
        .expect(200)
        .then((res) => {
          expect(res.body.name).toEqual(input.name);
          expect(res.body.imageUrl).toEqual(input.imageUrl);
          expect(res.body.uuid).toEqual(chainUuid);
        });
    });

    it(`Update nonexistent chain`, () => {
      const input = {
        name: ulid(),
        imageUrl: `https://${ulid()}.com/${ulid()}.png`,
      };
      return request(app.getHttpServer())
        .put(`/chains/foo`)
        .send(input)
        .expect(404);
    });
  });

  describe('GET /chains/{id}/events', () => {
    it(`Get all events`, () => {
      return request(app.getHttpServer())
        .get(`/chains/${chains[0].uuid}/events`)
        .expect(200)
        .then((res) => {
          events = res.body;
        });
    });

    it(`Get events with search`, () => {
      return request(app.getHttpServer())
        .get(`/chains/${chains[0].uuid}/events?search=${events[0].name}`)
        .expect(200)
        .then((res) => {
          expect(res.body).toHaveLength(1);
          expect(events[0].id).toEqual(res.body[0].id);
        });
    });
  });

  describe('GET /chains/{id}/events/{eventId}', () => {
    it(`Get event successfully`, () => {
      return request(app.getHttpServer())
        .get(`/chains/${chains[0].uuid}/events/${events[0].id}`)
        .expect(200);
    });

    it(`Get nonexistent event`, () => {
      return request(app.getHttpServer())
        .get(`/chains/${chains[0].uuid}/events/foo`)
        .expect(404);
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
