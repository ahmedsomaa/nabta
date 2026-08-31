export const EMAIL_SERVICE = Symbol('EMAIL_SERVICE');

export interface EmailSendParams {
  to: string;
  subject: string;
  html: string;
  templateId?: string;
}

export interface EmailService {
  send(params: EmailSendParams): Promise<void>;
}
