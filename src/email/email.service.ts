import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async sendEmails(addresses: string[], subject: string, body: string) {
    await this.mailerService.sendMail({
      from: `SubRelay Notifications ${this.configService.get('EMAIL_SENDER')}`,
      to: addresses,
      subject,
      html: body,
    });
  }
}
