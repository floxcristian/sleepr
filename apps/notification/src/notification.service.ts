import { Injectable } from '@nestjs/common';
import { NotifyEmailDto } from './dto/notify-email.dto';

@Injectable()
export class NotificationService {
  notifyEmail({ email }: NotifyEmailDto) {
    // Simulate sending an email notification
    console.log(`Sending email notification to: ${email}`);
    return { message: `Email sent to ${email}` };
  }
}
