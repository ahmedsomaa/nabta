import { Global, Module } from '@nestjs/common';
import { EMAIL_SERVICE } from './email.service';
import { ResendEmailService } from './resend-email.service';

@Global()
@Module({
  providers: [
    ResendEmailService,
    { provide: EMAIL_SERVICE, useExisting: ResendEmailService },
  ],
  exports: [EMAIL_SERVICE, ResendEmailService],
})
export class EmailModule {}
