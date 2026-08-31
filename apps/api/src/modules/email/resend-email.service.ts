import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import type { EmailSendParams, EmailService } from './email.service';

@Injectable()
export class ResendEmailService implements EmailService {
  private readonly logger = new Logger(ResendEmailService.name);
  private readonly client: Resend | null;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('RESEND_API_KEY') ?? '';
    this.from = this.config.get<string>('RESEND_FROM_EMAIL') ?? 'noreply@nabta.app';
    this.client = apiKey ? new Resend(apiKey) : null;
    if (!this.client) {
      this.logger.warn('RESEND_API_KEY empty — emails will be logged only');
    }
  }

  async send(params: EmailSendParams): Promise<void> {
    if (!this.client) {
      this.logger.log(`[dev-email] to=${params.to} subject=${params.subject}`);
      this.logger.debug(params.html);
      return;
    }
    const result = await this.client.emails.send({
      from: this.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    if (result.error) {
      throw new Error(result.error.message);
    }
  }
}
