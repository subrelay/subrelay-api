import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ChainModule } from './chain/chain.module';
import { TaskModule } from './task/task.module';
import { WorkflowModule } from './workflow/workflow.module';
import { BullModule } from '@nestjs/bull';
import { APP_FILTER } from '@nestjs/core';
import { InternalServerExceptionsFilter } from './common/internal-server-error.filter';
import { AuthMiddleware } from './common/auth.middleware';
import { WorkerModule } from './worker/worker.module';
import { truncate } from 'lodash';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        synchronize: true,
        logging: configService.get('NODE_ENV').startsWith('local'),
        autoLoadEntities: true,
      }),
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
          password: configService.get('REDIS_PASSWORD'),
        },
      }),
    }),

    WorkerModule,
    UserModule,
    ChainModule,
    TaskModule,
    WorkflowModule,
    WorkerModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: InternalServerExceptionsFilter,
    },
  ],
})
export class AppModule implements NestModule {
  public configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(AuthMiddleware)
      .exclude(
        { method: RequestMethod.GET, path: '/' },
        { method: RequestMethod.GET, path: '/workers' },
        { method: RequestMethod.GET, path: '/chains' },
        { method: RequestMethod.GET, path: '/tasks/filter/operators' },
        { method: RequestMethod.GET, path: '/tasks/filter/fields' },
        { method: RequestMethod.GET, path: '/tasks/custom-message/fields' },
        { method: RequestMethod.GET, path: '/chains/:uuid/events' },
        { method: RequestMethod.GET, path: '/chains/:uuid/events/:eventId' },
        { method: RequestMethod.POST, path: '/chains' },
        { method: RequestMethod.PUT, path: '/chains/:uuid' },
      )
      .forRoutes('*');
  }
}
