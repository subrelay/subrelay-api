import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { WebhookService } from './webhook.service';
import * as CryptoUtil from '../common/crypto.util';

jest.mock('../common/crypto.util', () => {
  return {
    decryptText: jest.fn(),
    generateWebhookSignature: jest.fn(),
  };
});

describe('WebhookService', () => {
  let service: WebhookService;
  let httpService: HttpService;
  let configService: ConfigService;

  const secret = 'mysecret';
  const mykey = 'mykey';
  const decryptedText = 'abcd1234';
  const input = { message: 'Hello, world!' };
  const signature = 'abcd1234';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        HttpService,
        ConfigService,
        {
          provide: HttpService,
          useValue: {
            axiosRef: {
              post: jest.fn(),
            },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should send a message with the correct headers', async () => {
    const url = 'https://example.com';
    const input = { message: 'Hello, world!' };
    const signatureHeader = 'abc123';

    jest
      .spyOn(httpService.axiosRef, 'post')
      .mockImplementation(() => Promise.resolve());

    await service.sendMessage(url, input, signatureHeader);

    expect(httpService.axiosRef.post).toHaveBeenCalledWith(url, input, {
      headers: {
        Accept: 'application/json',
        'X-Hub-Signature-256': signatureHeader,
      },
    });
  });

  it('should call decryptText with encrypted is true', () => {
    jest.spyOn(configService, 'get').mockReturnValueOnce(mykey);
    const decryptedTextSpy = jest
      .spyOn(CryptoUtil, 'decryptText')
      .mockReturnValueOnce(decryptedText);
    jest
      .spyOn(CryptoUtil, 'generateWebhookSignature')
      .mockReturnValueOnce(signature);

    service.generateSignatureHeader(secret, true, input);
    expect(decryptedTextSpy).toHaveBeenCalledWith(secret, mykey);
    decryptedTextSpy.mockClear();
  });

  it('should generate a signature header with encrypted is false', () => {
    jest.spyOn(configService, 'get').mockReturnValueOnce(mykey);
    jest.spyOn(CryptoUtil, 'decryptText').mockReturnValueOnce(decryptedText);
    jest
      .spyOn(CryptoUtil, 'generateWebhookSignature')
      .mockReturnValueOnce(signature);

    const result = service.generateSignatureHeader(secret, false, input);

    expect(result).toBe('abcd1234');
    expect(configService.get).toHaveBeenCalledWith('WEBHOOK_SECRET_KEY');
    expect(CryptoUtil.decryptText).not.toHaveBeenCalled();
    expect(CryptoUtil.generateWebhookSignature).toHaveBeenCalledWith(
      secret,
      input,
    );
  });
});
