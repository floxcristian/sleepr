import { Injectable, Logger } from '@nestjs/common';
import { NotifyEmailDto } from './dto/notify-email.dto';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {}

  private async getTransporter() {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: this.configService.get<string>('SMTP_USER'),
          clientId: this.configService.get<string>('GOOGLE_OAUTH_CLIENT_ID'),
          clientSecret: this.configService.get<string>(
            'GOOGLE_OAUTH_CLIENT_SECRET',
          ),
          refreshToken: this.configService.get<string>(
            'GOOGLE_OAUTH_REFRESH_TOKEN',
          ),
        },
        tls: {
          rejectUnauthorized: false,
        },
      });
    }
    return this.transporter;
  }

  async notifyEmail({ email, text }: NotifyEmailDto) {
    try {
      const transporter = await this.getTransporter();

      await transporter.sendMail({
        from: this.configService.get<string>('SMTP_USER'),
        to: email,
        subject: 'Sleepr Notification',
        text,
      });

      this.logger.log(`Email successfully sent to ${email}`);
      return { message: `Email sent to ${email}` };
    } catch (error) {
      this.logger.error(`Failed to send email to ${email}`, error.stack);
      throw new Error(`Failed to send notification email: ${error.message}`);
    }
  }
}
