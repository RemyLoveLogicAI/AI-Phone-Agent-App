import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server } from 'ws';
import * as WebSocket from 'ws';
import { DeepgramService } from './services/deepgram.service';
import { CartesiaService } from './services/cartesia.service';
import { DialogueService } from './services/dialogue.service';
import { LedgerService, LedgerEventType } from './services/ledger.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  processTwilioAudioToAsr,
  processTtsToTwilio,
  chunkAudio,
} from './utils/audio.util';

interface TwilioSession {
  sessionId: string;
  streamSid: string;
  callSid: string;
  callId: string;
  deepgramEventEmitter: any;
  isProcessing: boolean;
  lastTranscript: string;
  startTime: Date;
}

/**
 * Twilio Media Stream Gateway
 * Handles Twilio phone call media streams
 * Core loop: Twilio μ-law → PCM → Deepgram → Dialogue → Cartesia → PCM → μ-law → Twilio
 */
@WebSocketGateway({
  path: '/twilio-media',
})
export class TwilioMediaGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TwilioMediaGateway.name);
  private readonly sessions = new Map<string, TwilioSession>();

  constructor(
    private readonly deepgramService: DeepgramService,
    private readonly cartesiaService: CartesiaService,
    private readonly dialogueService: DialogueService,
    private readonly ledgerService: LedgerService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Handle Twilio Media Stream connection
   */
  async handleConnection(client: any) {
    this.logger.log('Twilio Media Stream connection initiated');

    client.on('message', async (message: string) => {
      try {
        const msg = JSON.parse(message);
        await this.handleMessage(client, msg);
      } catch (error) {
        this.logger.error(`Error parsing message: ${error.message}`);
      }
    });

    client.on('error', (error: any) => {
      this.logger.error('WebSocket error:', error);
    });
  }

  /**
   * Handle disconnect
   */
  async handleDisconnect(client: any) {
    this.logger.log('Twilio Media Stream disconnected');

    // Find and cleanup session
    for (const [sessionId, session] of this.sessions.entries()) {
      try {
        await this.cleanupSession(sessionId);
      } catch (error) {
        this.logger.error(`Error cleaning up session: ${error.message}`);
      }
    }
  }

  /**
   * Handle different Twilio message types
   */
  private async handleMessage(client: any, msg: any) {
    switch (msg.event) {
      case 'connected':
        this.logger.log('Twilio connected event received');
        break;

      case 'start':
        await this.handleStart(client, msg);
        break;

      case 'media':
        await this.handleMedia(client, msg);
        break;

      case 'stop':
        await this.handleStop(client, msg);
        break;

      case 'mark':
        // Mark events for tracking audio playback
        this.logger.debug(`Mark event: ${msg.mark?.name}`);
        break;

      default:
        this.logger.debug(`Unknown event: ${msg.event}`);
    }
  }

  /**
   * Handle stream start
   */
  private async handleStart(client: any, msg: any) {
    const { streamSid, callSid, customParameters } = msg.start;
    const sessionId = streamSid;

    this.logger.log(`Twilio stream started: ${streamSid}, Call: ${callSid}`);

    try {
      // Find or create call record
      let call = await this.prisma.call.findUnique({
        where: { sid: callSid },
      });

      if (!call) {
        call = await this.prisma.call.create({
          data: {
            sid: callSid,
            direction: customParameters?.direction || 'INBOUND',
            status: 'in-progress',
          },
        });
      }

      // Initialize Deepgram session
      const { connection, eventEmitter } =
        await this.deepgramService.createStreamingSession(sessionId);

      // Initialize dialogue session
      this.dialogueService.initializeSession(sessionId);

      // Create session
      const session: TwilioSession = {
        sessionId,
        streamSid,
        callSid,
        callId: call.id,
        deepgramEventEmitter: eventEmitter,
        isProcessing: false,
        lastTranscript: '',
        startTime: new Date(),
      };

      this.sessions.set(sessionId, session);

      // Log event
      await this.ledgerService.logEvent(call.id, LedgerEventType.CALL_STARTED, {
        sessionId,
        streamSid,
        callSid,
        source: 'twilio',
      });

      // Setup Deepgram handlers
      this.setupDeepgramHandlers(client, sessionId, eventEmitter);

      // Send initial greeting
      const greeting = await this.dialogueService.generateGreeting(sessionId);
      await this.sendAIResponse(client, sessionId, greeting);
    } catch (error) {
      this.logger.error(`Error in handleStart: ${error.message}`, error.stack);
    }
  }

  /**
   * Handle incoming media (audio)
   */
  private async handleMedia(client: any, msg: any) {
    const streamSid = msg.streamSid;
    const session = this.sessions.get(streamSid);

    if (!session) {
      this.logger.warn(`No session found for media: ${streamSid}`);
      return;
    }

    try {
      // Convert Twilio audio (base64 μ-law) to PCM
      const pcmAudio = processTwilioAudioToAsr(msg.media.payload);

      // Send to Deepgram
      this.deepgramService.sendAudioPCM(streamSid, pcmAudio);

      // Log
      await this.ledgerService.logEvent(
        session.callId,
        LedgerEventType.AUDIO_RECEIVED,
        {
          samples: pcmAudio.length,
          timestamp: msg.media.timestamp,
        },
      );
    } catch (error) {
      this.logger.error(`Error handling media: ${error.message}`);
      await this.ledgerService.logEvent(
        session.callId,
        LedgerEventType.ERROR,
        { error: error.message, context: 'handleMedia' },
      );
    }
  }

  /**
   * Handle stream stop
   */
  private async handleStop(client: any, msg: any) {
    const streamSid = msg.streamSid;
    this.logger.log(`Twilio stream stopped: ${streamSid}`);

    await this.cleanupSession(streamSid);
  }

  /**
   * Setup Deepgram event handlers
   */
  private setupDeepgramHandlers(
    client: any,
    sessionId: string,
    eventEmitter: any,
  ) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Handle transcripts
    eventEmitter.on('transcript', async (result: any) => {
      try {
        const eventType = result.isFinal
          ? LedgerEventType.TRANSCRIPT_FINAL
          : LedgerEventType.TRANSCRIPT_PARTIAL;

        await this.ledgerService.logEvent(session.callId, eventType, {
          text: result.text,
          confidence: result.confidence,
        });

        // Process final transcripts
        if (result.isFinal && result.text.trim().length > 0) {
          session.lastTranscript = result.text;
          await this.processUserUtterance(client, sessionId, result.text);
        }
      } catch (error) {
        this.logger.error(`Error handling transcript: ${error.message}`);
      }
    });

    // Handle errors
    eventEmitter.on('error', async (error: any) => {
      this.logger.error(`Deepgram error for ${sessionId}:`, error);
      await this.ledgerService.logEvent(session.callId, LedgerEventType.ERROR, {
        error: error.message,
        context: 'deepgram',
      });
    });
  }

  /**
   * Process user utterance
   */
  private async processUserUtterance(
    client: any,
    sessionId: string,
    text: string,
  ) {
    const session = this.sessions.get(sessionId);
    if (!session || session.isProcessing) {
      return;
    }

    session.isProcessing = true;

    try {
      this.logger.log(`Processing utterance: "${text}"`);

      await this.ledgerService.logEvent(
        session.callId,
        LedgerEventType.AI_PROCESSING_START,
        { userText: text },
      );

      // Generate AI response
      const response = await this.dialogueService.generateResponse(
        sessionId,
        text,
      );

      await this.ledgerService.logEvent(
        session.callId,
        LedgerEventType.AI_RESPONSE,
        { response },
      );

      // Send response
      await this.sendAIResponse(client, sessionId, response);
    } catch (error) {
      this.logger.error(`Error processing utterance: ${error.message}`);
      await this.ledgerService.logEvent(session.callId, LedgerEventType.ERROR, {
        error: error.message,
        context: 'processUserUtterance',
      });
    } finally {
      session.isProcessing = false;
    }
  }

  /**
   * Generate speech and send to Twilio
   */
  private async sendAIResponse(
    client: any,
    sessionId: string,
    text: string,
  ) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    try {
      this.logger.log(`Generating speech for: "${text}"`);

      await this.ledgerService.logEvent(
        session.callId,
        LedgerEventType.TTS_START,
        { text },
      );

      // Generate speech and stream to Twilio
      for await (const audioChunk of this.cartesiaService.generateSpeechStream(
        text,
      )) {
        // Convert PCM to Twilio format (μ-law base64)
        const twilioAudio = processTtsToTwilio(audioChunk);

        // Send to Twilio in chunks
        // Twilio expects 20ms chunks for 8kHz = 160 bytes
        const chunks = Array.from(chunkAudio(audioChunk, 320)); // 20ms at 16kHz

        for (const chunk of chunks) {
          const twilioChunk = processTtsToTwilio(chunk);

          client.send(
            JSON.stringify({
              event: 'media',
              streamSid: session.streamSid,
              media: {
                payload: twilioChunk,
              },
            }),
          );

          await this.ledgerService.logEvent(
            session.callId,
            LedgerEventType.TTS_CHUNK,
            { samples: chunk.length },
          );
        }
      }

      // Send mark event to know when audio finishes playing
      client.send(
        JSON.stringify({
          event: 'mark',
          streamSid: session.streamSid,
          mark: {
            name: 'ai_response_complete',
          },
        }),
      );

      await this.ledgerService.logEvent(
        session.callId,
        LedgerEventType.TTS_COMPLETE,
        { text },
      );
    } catch (error) {
      this.logger.error(`Error sending AI response: ${error.message}`);
      await this.ledgerService.logEvent(session.callId, LedgerEventType.ERROR, {
        error: error.message,
        context: 'sendAIResponse',
      });
    }
  }

  /**
   * Cleanup session
   */
  private async cleanupSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    try {
      // Update call record
      await this.prisma.call.update({
        where: { id: session.callId },
        data: {
          status: 'completed',
          duration: Math.floor(
            (new Date().getTime() - session.startTime.getTime()) / 1000,
          ),
        },
      });

      await this.ledgerService.logEvent(
        session.callId,
        LedgerEventType.CALL_ENDED,
        {
          duration: Math.floor(
            (new Date().getTime() - session.startTime.getTime()) / 1000,
          ),
        },
      );

      // Cleanup services
      await this.deepgramService.closeSession(sessionId);
      this.dialogueService.endSession(sessionId);

      this.sessions.delete(sessionId);
      this.logger.log(`Session cleaned up: ${sessionId}`);
    } catch (error) {
      this.logger.error(`Error cleaning up session: ${error.message}`);
    }
  }
}
