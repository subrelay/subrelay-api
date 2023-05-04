import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { decryptText, generateWebhookSignature } from '../common/crypto.util';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class WebhookService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async sendMessage(url: string, input: any, signatureHeader?: string) {
    const headers = { Accept: 'application/json' };
    if (signatureHeader) {
      headers['X-Hub-Signature-256'] = signatureHeader;
    }

    await this.httpService.axiosRef.post(url, input, {
      headers,
    });
  }

  generateSignatureHeader(secret: string, encrypted: boolean, input: any) {
    let decryptedSecret;
    const webhookSecretKey = this.configService.get('WEBHOOK_SECRET_KEY');

    if (secret) {
      if (encrypted) {
        decryptedSecret = decryptText(secret, webhookSecretKey);
      } else {
        decryptedSecret = secret;
      }
    }

    return decryptedSecret && generateWebhookSignature(decryptedSecret, input);
  }
}
