import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import { IsNumber, IsString } from 'class-validator';
import { Request, Response, NextFunction } from 'express';
import { UserService } from 'src/user/user.service';

class AuthInfo {
  @IsNumber()
  timestamp: number;

  @IsString()
  signature: string;

  @IsString()
  address: string;
}

function getAuthInfo(base64Token: string): AuthInfo {
  try {
    const buffer = Buffer.from(base64Token, 'base64');
    const authInfo = JSON.parse(buffer.toString('utf8'));

    return authInfo;
  } catch (error) {
    console.error(error);
    throw new ForbiddenException();
  }
}
@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly userService: UserService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const { authorization } = req.headers;
    if (!authorization) {
      throw new ForbiddenException('Token not found');
    }

    const authInfo = getAuthInfo(authorization);
    const user =
      (await this.userService.getUser(authInfo.address)) ||
      (await this.userService.createUser({ address: authInfo.address }));
    req.user = user;
    next();
  }
}
