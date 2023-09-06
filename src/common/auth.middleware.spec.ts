import { AuthMiddleware } from './auth.middleware';
import { Request, Response, NextFunction } from 'express';
import { UserService } from '../user/user.service';
import * as Auth from './auth';
import { mockUserEntity } from '../../test/mock-data.util';
import { ConfigService } from '@nestjs/config';

jest.mock('./auth', () => {
  return {
    getAuthInfo: jest.fn(),
    getUserMessage: jest.fn(),
    tokenExpired: jest.fn(),
    verifyUserSignature: jest.fn(),
  };
});

describe('AuthMiddleware', () => {
  let authMiddleware: AuthMiddleware;
  let userService: UserService;
  let configService: ConfigService;

  const user = mockUserEntity();
  const authInfo = {
    address: user.id,
    signature: 'testSignature',
    timestamp: Date.now(),
  };

  beforeEach(() => {
    userService = {
      getUserSummary: jest.fn(),
      createUser: jest.fn(),
    } as any;

    configService = {
      get: jest.fn(),
    } as any;

    authMiddleware = new AuthMiddleware(userService, configService);
  });

  describe('use', () => {
    it('should set req.user to the user retrieved from the user service', async () => {
      const req: Request = {} as any;
      const res: Response = {} as any;
      const next: NextFunction = jest.fn();
      jest.spyOn(Auth, 'getAuthInfo').mockReturnValueOnce(authInfo);
      jest.spyOn(userService, 'getUserSummary').mockResolvedValueOnce(user);
      jest
        .spyOn(authMiddleware, 'authorize')
        .mockImplementationOnce(() => Promise.resolve());

      await authMiddleware.use(req, res, next);

      expect(req.user).toBe(user);
      expect(userService.getUserSummary).toHaveBeenCalledWith(authInfo.address);
      expect(userService.createUser).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it('should create a new user if one does not exist for the given address', async () => {
      const req: Request = {} as any;
      const res: Response = {} as any;
      const next: NextFunction = jest.fn();

      jest.spyOn(Auth, 'getAuthInfo').mockReturnValueOnce(authInfo);
      jest.spyOn(userService, 'getUserSummary').mockResolvedValueOnce(null);
      jest.spyOn(userService, 'createUser').mockResolvedValueOnce(user);
      jest
        .spyOn(authMiddleware, 'authorize')
        .mockImplementationOnce(() => Promise.resolve());

      await authMiddleware.use(req, res, next);

      expect(req.user).toBe(user);
      expect(userService.getUserSummary).toHaveBeenCalledWith(authInfo.address);
      expect(userService.createUser).toHaveBeenCalledWith({
        address: authInfo.address,
      });
      expect(next).toHaveBeenCalled();
    });
  });

  describe('authorize', () => {
    it('should throw a ForbiddenException if the token has expired', () => {
      const req: Request = {} as any;
      jest.spyOn(Auth, 'tokenExpired').mockReturnValueOnce(true);

      expect(() => authMiddleware.authorize(authInfo, req)).toThrow(
        'Token expired',
      );
    });

    it('should throw a ForbiddenException if the token is invalid', () => {
      const req: Request = {} as any;
      jest.spyOn(Auth, 'tokenExpired').mockReturnValueOnce(false);
      jest.spyOn(Auth, 'verifyUserSignature').mockReturnValueOnce(false);

      expect(() => authMiddleware.authorize(authInfo, req)).toThrow(
        'Token invalid',
      );
    });
  });
});
