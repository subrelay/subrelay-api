import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import { IsNumber, IsString } from 'class-validator';
import { Request, Response, NextFunction } from 'express';
import { UserService } from 'src/user/user.service';
import { signatureVerify } from '@polkadot/util-crypto';
import { stringToU8a } from '@polkadot/util';

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

function authorize(authInfo: AuthInfo, req: Request) {
  // Token expiration is 10 minutes
  if (Date.now() - authInfo.timestamp > 10 * 60 * 1000) {
    throw new ForbiddenException('Token expired');
  }

  const data = {
    endpoint: req.originalUrl,
    method: req.method,
    body: req.body,
    timestamp: authInfo.timestamp,
  };

  const message = stringToU8a(JSON.stringify(data));
  const { isValid } = signatureVerify(
    message,
    authInfo.signature,
    authInfo.address,
  );

  if (!isValid) {
    throw new ForbiddenException('Token invalid');
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
    authorize(authInfo, req);
    const user =
      (await this.userService.getUser(authInfo.address)) ||
      (await this.userService.createUser({ address: authInfo.address }));
    req.user = user;

    next();
  }
}
