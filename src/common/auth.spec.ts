import { Request } from 'express';
import {
  getAuthInfo,
  getUserMessage,
  tokenExpired,
  verifyUserSignature,
} from './auth';
import { cryptoWaitReady } from '@polkadot/util-crypto';

const getToken =
  'eyJhZGRyZXNzIjoiNUNmb1ZWeWU2MnM3bzZpbWplaHdmdE5qakFQYUJIUk5iS3ZiZjdBQzV5c2lTOWtYIiwidGltZXN0YW1wIjoxNjg2NzIyODkxOTAwLCJzaWduYXR1cmUiOiIweDU0ODk4YjNiYmVmYTFiMjJkMTYxODFlYTFhNDJkNzMyOGVjNmNjMzlkMjI0ZDc0MjJkYzBlNjljOGI5YjU5NWY5MjMzMDM2YzAyMzc3OWVhZDEyZTM3ZDA2MzFlNTY5Y2YwYzViNGE4NjdkMTBmMDk2ZDY1NTA2MmMxYTRiNDhiIn0=';
const authInfoForGetRequest = {
  address: '5CfoVVye62s7o6imjehwftNjjAPaBHRNbKvbf7AC5ysiS9kX',
  timestamp: 1686722891900,
  signature:
    '0x54898b3bbefa1b22d16181ea1a42d7328ec6cc39d224d7422dc0e69c8b9b595f9233036c023779ead12e37d0631e569cf0c5b4a867d10f096d655062c1a4b48b',
};
const actionToken =
  'eyJhZGRyZXNzIjoiNUNmb1ZWeWU2MnM3bzZpbWplaHdmdE5qakFQYUJIUk5iS3ZiZjdBQzV5c2lTOWtYIiwidGltZXN0YW1wIjoxNjg2NzIzMTA4MjIwLCJzaWduYXR1cmUiOiIweDgwNzhiNzgwNjU2YWY3ODMyMGY1MzdjMzE5YjNlNzFhOGVmODcwMmU3ODVhMjZmYjZiNDhlMzViODYyMjIzNjhiNmViOTc3ZTNkYjE1MzYwMTZjYjQxZTUxMjJhYzdjNjliY2JjZmE2MTE4YzMzNTkzMWU1ZjM3YWEyOWRlMjg1In0=';
const authInfoForActionRequest = {
  address: '5CfoVVye62s7o6imjehwftNjjAPaBHRNbKvbf7AC5ysiS9kX',
  timestamp: 1686723108220,
  signature:
    '0x8078b780656af78320f537c319b3e71a8ef8702e785a26fb6b48e35b86222368b6eb977e3db1536016cb41e5122ac7c69bcbcfa6118c335931e5f37aa29de285',
};

const userMessageForGetRequest =
  '0x7b22656e64706f696e74223a222f2a222c226d6574686f64223a22474554222c22626f6479223a7b7d2c2274696d657374616d70223a313638363732323839313930307d';

describe('getAuthInfo', () => {
  it('should throw an error if no token is provided', () => {
    expect(() =>
      getAuthInfo({
        headers: {},
      } as unknown as Request),
    ).toThrow('Token not found');
  });

  it('should throw an error if the token is not a valid base64 string', () => {
    expect(() =>
      getAuthInfo({
        headers: { authorization: 'notbase64' },
      } as unknown as Request),
    ).toThrow('Invalid token');
  });

  it('should return the auth info if the get token is valid', () => {
    expect(
      getAuthInfo({
        headers: {
          authorization: getToken,
        },
      } as unknown as Request),
    ).toEqual(authInfoForGetRequest);
  });

  it('should return the auth info if the action token is valid', () => {
    expect(
      getAuthInfo({
        headers: {
          authorization: actionToken,
        },
      } as unknown as Request),
    ).toEqual(authInfoForActionRequest);
  });
});

describe('tokenExpired', () => {
  it('should throw an error if the token has expired', () => {
    jest
      .spyOn(Date, 'now')
      .mockReturnValueOnce(
        authInfoForActionRequest.timestamp + 25 * 60 * 60 * 1000,
      );

    expect(tokenExpired(authInfoForActionRequest.timestamp)).toBe(true);
  });

  it('should not throw an error if the action token has not expired', () => {
    jest
      .spyOn(Date, 'now')
      .mockReturnValue(authInfoForActionRequest.timestamp + 1 * 60 * 60 * 1000);

    expect(tokenExpired(authInfoForActionRequest.timestamp)).toBe(false);
  });
});

describe('getUserMessage', () => {
  it('should set endpoint and method to /* and GET if request method is GET', () => {
    const req = {
      originalUrl: '/users',
      method: 'GET',
      body: {},
    } as unknown as Request;
    const result = getUserMessage(authInfoForGetRequest.timestamp, req);

    expect(typeof result).toBe('string');
    expect(result.startsWith('0x')).toBe(true);
    expect(result).toEqual(userMessageForGetRequest);
  });

  it('should not throw error with action token', () => {
    const actionReqInfo = {
      originalUrl: '/workflows/01H2W8HDDK5VN7M1WTP0QQ7D2R',
      method: 'PATCH',
      body: { status: 'pausing' },
    } as unknown as Request;
    const result = getUserMessage(
      authInfoForGetRequest.timestamp,
      actionReqInfo,
    );

    expect(typeof result).toBe('string');
    expect(result.startsWith('0x')).toBe(true);
    expect(result).toEqual(
      '0x7b22656e64706f696e74223a222f776f726b666c6f77732f3031483257384844444b35564e374d3157545030515137443252222c226d6574686f64223a225041544348222c22626f6479223a7b22737461747573223a2270617573696e67227d2c2274696d657374616d70223a313638363732323839313930307d',
    );
  });
});

describe('verifyUserSignature', () => {
  it('should throw an exception if signature is invalid', () => {
    expect(
      verifyUserSignature(
        userMessageForGetRequest,
        'fooandbar',
        authInfoForGetRequest.address,
      ),
    ).toBe(false);
  });

  it('should not throw an exception if signature is valid', async () => {
    await cryptoWaitReady();

    expect(
      verifyUserSignature(
        userMessageForGetRequest,
        authInfoForGetRequest.signature,
        authInfoForGetRequest.address,
      ),
    ).toBe(true);
  });
});
