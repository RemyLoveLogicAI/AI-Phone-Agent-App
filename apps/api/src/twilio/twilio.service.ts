import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Twilio from 'twilio';

@Injectable()
export class TwilioService {
  private client: Twilio.Twilio;
  private readonly logger = new Logger(TwilioService.name);

  constructor(private configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');

    if (!accountSid || !authToken) {
      this.logger.warn('Twilio credentials not found. Twilio service will not function correctly.');
      return;
    }

    this.client = Twilio(accountSid, authToken);
  }

  getTwilioClient() {
    return this.client;
  }

  validateRequest(url: string, params: any, signature: string): boolean {
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    return Twilio.validateRequest(authToken, signature, url, params);
  }
}
