import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { UserService } from '../user/user.service';
import {
  AuthInfo,
  getAuthInfo,
  getUserMessage,
  tokenExpired,
  verifyUserSignature,
} from './auth';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly userService: UserService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const authInfo = getAuthInfo(req);
    this.authorize(authInfo, req);

    const user =
      (await this.userService.getUserSummary(authInfo.address)) ||
      (await this.userService.createUser({ address: authInfo.address }));

    req.user = user;

    next();
  }

  authorize(authInfo: AuthInfo, req: Request) {
    if (tokenExpired(authInfo.timestamp)) {
      throw new ForbiddenException('Token expired');
    }

    const msg = getUserMessage(authInfo.timestamp, req);
    const isValid = verifyUserSignature(
      msg,
      authInfo.signature,
      authInfo.address,
    );
    if (!isValid) {
      throw new ForbiddenException('Token invalid');
    }
  }
}
