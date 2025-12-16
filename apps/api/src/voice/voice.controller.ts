import { Controller, Get, Post, Body, Param, Logger } from '@nestjs/common';
import { DeepgramService } from './services/deepgram.service';
import { CartesiaService } from './services/cartesia.service';
import { DialogueService } from './services/dialogue.service';
import { LedgerService } from './services/ledger.service';
import * as Twilio from 'twilio';
import { ConfigService } from '@nestjs/config';
import { Config } from '../config/config.schema';

/**
 * Voice Controller
 * REST endpoints for voice AI functionality
 */
@Controller('voice')
export class VoiceController {
  private readonly logger = new Logger(VoiceController.name);
  private readonly twilioPhoneNumber: string;

  constructor(
    private readonly deepgramService: DeepgramService,
    private readonly cartesiaService: CartesiaService,
    private readonly dialogueService: DialogueService,
    private readonly ledgerService: LedgerService,
    private readonly configService: ConfigService<Config>,
  ) {
    this.twilioPhoneNumber = this.configService.get('TWILIO_PHONE_NUMBER', {
      infer: true,
    });
  }

  /**
   * Health check endpoint
   */
  @Get('health')
  async healthCheck() {
    const deepgramHealth = await this.deepgramService.healthCheck();
    const cartesiaHealth = await this.cartesiaService.healthCheck();
    const dialogueHealth = await this.dialogueService.healthCheck();

    return {
      status: deepgramHealth && cartesiaHealth && dialogueHealth ? 'healthy' : 'unhealthy',
      services: {
        deepgram: deepgramHealth ? 'up' : 'down',
        cartesia: cartesiaHealth ? 'up' : 'down',
        dialogue: dialogueHealth ? 'up' : 'down',
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Twilio webhook for incoming calls
   * Returns TwiML to establish Media Stream
   */
  @Post('twilio/incoming')
  handleIncomingCall(@Body() body: any) {
    const { CallSid, From, To } = body;
    this.logger.log(`Incoming call: ${CallSid} from ${From}`);

    const response = new Twilio.twiml.VoiceResponse();

    // Start media stream
    const connect = response.connect();
    const stream = connect.stream({
      url: `wss://${this.configService.get('NODE_ENV') === 'production'
        ? 'YOUR_DOMAIN'
        : 'localhost:' + this.configService.get('PORT')}/twilio-media`,
    });

    stream.parameter({
      name: 'callSid',
      value: CallSid,
    });

    stream.parameter({
      name: 'direction',
      value: 'inbound',
    });

    this.logger.log(`TwiML generated for call: ${CallSid}`);
    return response.toString();
  }

  /**
   * Twilio status callback
   */
  @Post('twilio/status')
  handleStatusCallback(@Body() body: any) {
    const { CallSid, CallStatus, CallDuration } = body;
    this.logger.log(`Call status: ${CallSid} - ${CallStatus} (${CallDuration}s)`);

    return { received: true };
  }

  /**
   * Get call transcript
   */
  @Get('transcript/:callId')
  async getTranscript(@Param('callId') callId: string) {
    try {
      const transcript = await this.ledgerService.getConversationTranscript(callId);
      return {
        callId,
        transcript,
        count: transcript.length,
      };
    } catch (error) {
      this.logger.error(`Error getting transcript: ${error.message}`);
      return {
        error: 'Failed to retrieve transcript',
        message: error.message,
      };
    }
  }

  /**
   * Get call statistics
   */
  @Get('stats/:callId')
  async getCallStats(@Param('callId') callId: string) {
    try {
      const stats = await this.ledgerService.getCallStatistics(callId);
      return {
        callId,
        ...stats,
      };
    } catch (error) {
      this.logger.error(`Error getting stats: ${error.message}`);
      return {
        error: 'Failed to retrieve statistics',
        message: error.message,
      };
    }
  }

  /**
   * Get call events
   */
  @Get('events/:callId')
  async getCallEvents(@Param('callId') callId: string) {
    try {
      const events = await this.ledgerService.getCallEvents(callId);
      return {
        callId,
        events,
        count: events.length,
      };
    } catch (error) {
      this.logger.error(`Error getting events: ${error.message}`);
      return {
        error: 'Failed to retrieve events',
        message: error.message,
      };
    }
  }

  /**
   * List available TTS voices
   */
  @Get('voices')
  async listVoices() {
    try {
      const voices = await this.cartesiaService.listVoices();
      return voices;
    } catch (error) {
      this.logger.error(`Error listing voices: ${error.message}`);
      return {
        error: 'Failed to list voices',
        message: error.message,
      };
    }
  }

  /**
   * Get service statistics
   */
  @Get('service-stats')
  getServiceStats() {
    return {
      deepgramActiveSessions: this.deepgramService.getActiveSessionCount(),
      dialogueActiveSessions: this.dialogueService.getActiveSessionCount(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Cleanup stale sessions
   */
  @Post('cleanup')
  cleanupStaleSessions() {
    const cleaned = this.dialogueService.cleanupStaleSessions();
    return {
      cleaned,
      message: `Cleaned up ${cleaned} stale sessions`,
    };
  }
}
