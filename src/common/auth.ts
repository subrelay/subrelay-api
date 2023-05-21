import { ForbiddenException } from '@nestjs/common';
import { stringToHex } from '@polkadot/util';
import { signatureVerify } from '@polkadot/util-crypto';
import { IsNumber, IsString } from 'class-validator';
import { Request } from 'express';

export class AuthInfo {
  @IsNumber()
  timestamp: number;

  @IsString()
  signature: string;

  @IsString()
  address: string;
}

export class StateInfo {
  timestamp: number;
  userId: string;
}

export function getAuthInfo(req: Request): AuthInfo {
  const { authorization } = req.headers;
  if (!authorization) {
    throw new ForbiddenException('Token not found');
  }

  try {
    const buffer = Buffer.from(authorization, 'base64');
    const authInfo = JSON.parse(buffer.toString('utf8'));

    return authInfo;
  } catch (error) {
    console.error(error);
    throw new ForbiddenException();
  }
}

export function verifyUser(authInfo: AuthInfo, data) {
  const message = stringToHex(JSON.stringify(data));
  const { isValid } = signatureVerify(
    message,
    authInfo.signature,
    authInfo.address,
  );

  if (!isValid) {
    throw new ForbiddenException('Token invalid');
  }
}

export function isAuthStateExpired(state: string) {
  try {
    const buffer = Buffer.from(state, 'base64');
    const stateInfo: StateInfo = JSON.parse(buffer.toString('utf8'));

    return Date.now() - stateInfo.timestamp < 30 * 60 * 1000;
  } catch (error) {
    return false;
  }
}
