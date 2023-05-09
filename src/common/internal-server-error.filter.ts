import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import * as Rollbar from 'rollbar';
import { ConfigService } from '@nestjs/config';
import { TaskValidationError } from '../task/type/task.type';
import { TelegramTaskError } from '../task/type/telegram.type';
import { UserInputError } from './error.type';

@Catch()
export class InternalServerExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(InternalServerExceptionsFilter.name);

  constructor(private configService: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest();

    if (exception instanceof HttpException) {
      res.status(exception.getStatus()).json(exception.getResponse());
      return;
    }

    if (
      exception instanceof TaskValidationError ||
      exception instanceof TelegramTaskError ||
      exception instanceof UserInputError
    ) {
      res.status(HttpStatus.BAD_REQUEST).json({ message: exception.message });
      return;
    }

    const rollbarAccessToken = this.configService.get(
      'API_ROLLBAR_ACCESS_TOKEN',
    );
    if (rollbarAccessToken) {
      const rollbar = new Rollbar({
        accessToken: rollbarAccessToken,
        captureUncaught: true,
        captureUnhandledRejections: true,
        environment: this.configService.get('NODE_ENV'),
        addRequestData: req,
      });
      rollbar.error(exception as Error);
    }

    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: 'Something went wrong' });
  }
}
