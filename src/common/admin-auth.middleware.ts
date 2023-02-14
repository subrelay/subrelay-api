import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { UserService } from '../user/user.service';
import { AuthInfo, getAuthInfo, verifyUser } from './auth';

function isAdmin(authInfo: AuthInfo) {
  return process.env.ADMIN_ADDRESSES.split(',').includes(authInfo.address);
}

function authorize(authInfo: AuthInfo) {
  // Token expiration is 1 day
  if (Date.now() - authInfo.timestamp > 24 * 60 * 60 * 1000) {
    throw new ForbiddenException('Token expired');
  }

  if (!isAdmin(authInfo)) {
    throw new ForbiddenException("You don't have permission to do this action");
  }
  const data = {
    endpoint: `/*`,
    method: 'GET',
    body: {},
    timestamp: authInfo.timestamp,
  };

  verifyUser(authInfo, data);
}
@Injectable()
export class AdminAuthMiddleware implements NestMiddleware {
  constructor(private readonly userService: UserService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const authInfo = getAuthInfo(req);
    authorize(authInfo);
    const user =
      (await this.userService.getUser(authInfo.address)) ||
      (await this.userService.createUser({ address: authInfo.address }));
    req.user = user;

    next();
  }
}
