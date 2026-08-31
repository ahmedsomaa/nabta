import { Body, Controller, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { marketingContactSchema } from '@nabta/validation';
import { EMAIL_SERVICE, type EmailService } from '../email/email.service';

@Controller('marketing')
export class MarketingController {
  constructor(
    @Inject(EMAIL_SERVICE) private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  @Post('contact')
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  async contact(@Body() body: unknown) {
    const input = marketingContactSchema.parse(body);
    const to =
      this.config.get<string>('MARKETING_CONTACT_TO') ??
      this.config.get<string>('RESEND_FROM_EMAIL') ??
      'hello@nabta.local';
    const escaped = (value: string) =>
      value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    await this.email.send({
      to,
      subject: `Nabta demo request from ${input.name}`,
      html: `<p><strong>Name:</strong> ${escaped(input.name)}</p>
<p><strong>Email:</strong> ${escaped(input.email)}</p>
<p><strong>Message:</strong></p>
<p>${escaped(input.message).replace(/\n/g, '<br />')}</p>`,
    });
    return { ok: true };
  }
}
