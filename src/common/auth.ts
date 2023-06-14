import { ForbiddenException } from '@nestjs/common';
import { isHex, stringToHex } from '@polkadot/util';
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
    throw new ForbiddenException('Invalid token');
  }
}

export function verifyUserSignature(
  message: string,
  signature: string,
  address: string,
): boolean {
  if (!isHex(signature)) {
    return false;
  }

  const res = signatureVerify(message, signature, address);

  return res.isValid;
}

export function tokenExpired(timestamp: number): boolean {
  return Date.now() - timestamp > 24 * 60 * 60 * 1000;
}

export function getUserMessage(timestamp: number, req: Request) {
  const data = {
    endpoint: req.originalUrl,
    method: req.method,
    body: req.body,
    timestamp,
  };

  if (req.method.toLowerCase() === 'get') {
    data.endpoint = `/*`;
    data.method = 'GET';
  }

  return stringToHex(JSON.stringify(data));
}
