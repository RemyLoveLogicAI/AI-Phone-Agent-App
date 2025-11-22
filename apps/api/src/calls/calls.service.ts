import { Injectable, Logger } from '@nestjs/common';
import * as Twilio from 'twilio';

@Injectable()
export class CallsService {
  private readonly logger = new Logger(CallsService.name);

  handleIncomingCall(): string {
    const response = new Twilio.twiml.VoiceResponse();
    response.say('Hello! This is your AI Phone Agent. How can I help you today?');
    // We will add record/gather logic here later for Phase 2
    return response.toString();
  }
}
