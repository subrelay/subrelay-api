import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { UserService } from '../user/user.service';
import { AuthInfo, getAuthInfo, verifyUser } from './auth';

function authorize(authInfo: AuthInfo, req: Request) {
  // Token expiration is 1 day
  if (Date.now() - authInfo.timestamp > 24 * 60 * 60 * 1000) {
    throw new ForbiddenException('Token expired');
  }

  const data = {
    endpoint: req.originalUrl,
    method: req.method,
    body: req.body,
    timestamp: authInfo.timestamp,
  };

  if (req.method.toLowerCase() === 'get') {
    data.endpoint = `/*`;
    data.method = 'GET';
  }

  verifyUser(authInfo, data);
}
@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly userService: UserService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const authInfo = getAuthInfo(req);
    authorize(authInfo, req);
    const user =
      (await this.userService.getUser(authInfo.address)) ||
      (await this.userService.createUser({ address: authInfo.address }));
    req.user = user;

    next();
  }
}
