import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import * as Rollbar from 'rollbar';
import { ConfigService } from '@nestjs/config';

@Catch()
export class InternalServerExceptionsFilter implements ExceptionFilter {
  constructor(private configService: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();

    if (exception instanceof HttpException) {
      res.status(exception.getStatus()).json(exception.getResponse());
      return;
    }

    const rollbar = new Rollbar({
      accessToken: this.configService.get('ROLLBAR_ACCESS_TOKEN'),
      captureUncaught: true,
      captureUnhandledRejections: true,
      environment: this.configService.get('NODE_ENV'),
    });
    rollbar.error(exception as Error);

    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: 'Something went wrong' });
  }
}
