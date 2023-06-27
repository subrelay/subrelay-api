import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus } from '@nestjs/common';
import { InternalServerExceptionsFilter } from './internal-server-error.filter';
import { TaskValidationError } from '../task/type/task.type';
import { TelegramTaskError } from '../task/type/telegram.type';
import { UserInputError } from './error.type';
import * as Rollbar from 'rollbar';

jest.mock('rollbar');

describe('InternalServerExceptionsFilter', () => {
  let filter: InternalServerExceptionsFilter;
  const mockConfigService = {
    get: jest.fn(),
  };
  let status;
  let errorMessage;
  let json;
  let res;
  let host;

  beforeEach(() => {
    filter = new InternalServerExceptionsFilter(
      mockConfigService as unknown as ConfigService,
    );
    status = null;
    errorMessage = null;
    json = null;
    res = {
      status: jest.fn().mockImplementation((s) => {
        status = s;
        return res;
      }),
      json: jest.fn().mockImplementation((input) => {
        json = input;
        return res;
      }),
    };

    host = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValueOnce(res),
      }),
    } as any;
  });

  it('should catch HttpException and set the response status and body', () => {
    const exception = new HttpException('test-message', HttpStatus.BAD_REQUEST);

    filter.catch(exception, host);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith(exception.message);
  });

  it('should catch TaskValidationError and set the response status and body', () => {
    const message = 'Test TaskValidationError';
    const exception = new TaskValidationError(message);

    filter.catch(exception, host);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({ message });
  });

  it('should catch TelegramTaskError and set the response status and body', () => {
    const message = 'Test TelegramTaskError';
    const exception = new TelegramTaskError(message);

    filter.catch(exception, host);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({ message });
  });

  it('should catch UserInputError and set the response status and body', () => {
    const message = 'Test UserInputError';
    const exception = new UserInputError(message);

    filter.catch(exception, host);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({ message });
  });

  it('should catch any other exception and log it with Rollbar', () => {
    const exception = new Error('Test Error');
    jest.spyOn(mockConfigService, 'get').mockReturnValueOnce('test_token');
    const mockedRollbar = jest.spyOn(Rollbar.prototype, 'error');

    filter.catch(exception, host);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(res.json).toHaveBeenCalledWith({ message: 'Something went wrong' });
    expect(mockedRollbar).toHaveBeenCalled();
    mockedRollbar.mockClear();
  });

  it('should catch any other exception without Rollbar access token', () => {
    const exception = new Error('Test Error');
    jest.spyOn(mockConfigService, 'get').mockReturnValueOnce(null);
    const mockedRollbar = jest.spyOn(Rollbar.prototype, 'error');

    filter.catch(exception, host);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(res.json).toHaveBeenCalledWith({ message: 'Something went wrong' });
    expect(mockedRollbar).not.toHaveBeenCalled();
  });
});
