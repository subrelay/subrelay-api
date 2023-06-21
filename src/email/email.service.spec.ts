import { Test } from '@nestjs/testing';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

describe('EmailService', () => {
  let emailService: EmailService;
  let mailerService: MailerService;
  let configService: ConfigService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: MailerService,
          useValue: {
            sendMail: jest.fn(),
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

    emailService = moduleRef.get<EmailService>(EmailService);
    mailerService = moduleRef.get<MailerService>(MailerService);
    configService = moduleRef.get<ConfigService>(ConfigService);
  });

  describe('sendEmails', () => {
    it('should send an email with the correct parameters', async () => {
      const mockAddresses = ['user1@example.com', 'user2@example.com'];
      const mockSubject = 'Test Subject';
      const mockBody = '<h1>Test Body</h1>';
      const mockSender = 'sender@example.com';

      jest.spyOn(configService, 'get').mockReturnValue(mockSender);

      await emailService.sendEmails(mockAddresses, mockSubject, mockBody);

      expect(mailerService.sendMail).toHaveBeenCalledWith({
        from: `SubRelay Notifications ${mockSender}`,
        to: mockAddresses,
        subject: mockSubject,
        html: mockBody,
      });
    });
  });
});
