import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { DeepgramService } from './services/deepgram.service';
import { CartesiaService } from './services/cartesia.service';
import { DialogueService } from './services/dialogue.service';
import { LedgerService, LedgerEventType } from './services/ledger.service';
import { PrismaService } from '../prisma/prisma.service';
import { processBrowserAudioToAsr, processTtsToBrowser } from './utils/audio.util';

interface VoiceSession {
  sessionId: string;
  callId: string;
  deepgramEventEmitter: any;
  isProcessing: boolean;
  audioQueue: Int16Array[];
  lastTranscript: string;
  startTime: Date;
}

/**
 * Voice WebSocket Gateway
 * Handles browser-based voice interactions
 * Core loop: Browser Audio → Deepgram → Dialogue → Cartesia → Browser
 */
@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/voice',
})
export class VoiceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(VoiceGateway.name);
  private readonly sessions = new Map<string, VoiceSession>();

  constructor(
    private readonly deepgramService: DeepgramService,
    private readonly cartesiaService: CartesiaService,
    private readonly dialogueService: DialogueService,
    private readonly ledgerService: LedgerService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Handle new WebSocket connection
   */
  async handleConnection(client: Socket) {
    const sessionId = client.id;
    this.logger.log(`Client connected: ${sessionId}`);

    try {
      // Create call record
      const call = await this.prisma.call.create({
        data: {
          sid: `browser_${sessionId}`,
          direction: 'INBOUND',
          status: 'in-progress',
        },
      });

      // Initialize Deepgram streaming session
      const { connection, eventEmitter } =
        await this.deepgramService.createStreamingSession(sessionId);

      // Initialize dialogue session
      this.dialogueService.initializeSession(sessionId);

      // Create session
      const session: VoiceSession = {
        sessionId,
        callId: call.id,
        deepgramEventEmitter: eventEmitter,
        isProcessing: false,
        audioQueue: [],
        lastTranscript: '',
        startTime: new Date(),
      };

      this.sessions.set(sessionId, session);

      // Log event
      await this.ledgerService.logEvent(call.id, LedgerEventType.CALL_STARTED, {
        sessionId,
        source: 'browser',
      });

      // Setup Deepgram event handlers
      this.setupDeepgramHandlers(sessionId, eventEmitter);

      // Send initial greeting
      const greeting = await this.dialogueService.generateGreeting(sessionId);
      await this.sendAIResponse(sessionId, greeting);

      // Emit ready event to client
      client.emit('ready', {
        sessionId,
        message: 'Voice session ready',
      });
    } catch (error) {
      this.logger.error(`Error in handleConnection: ${error.message}`, error.stack);
      client.emit('error', { message: 'Failed to initialize voice session' });
      client.disconnect();
    }
  }

  /**
   * Handle client disconnect
   */
  async handleDisconnect(client: Socket) {
    const sessionId = client.id;
    this.logger.log(`Client disconnected: ${sessionId}`);

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

      // Log event
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

      // Remove session
      this.sessions.delete(sessionId);
    } catch (error) {
      this.logger.error(`Error in handleDisconnect: ${error.message}`);
    }
  }

  /**
   * Receive audio from browser
   */
  @SubscribeMessage('audio')
  async handleAudio(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { audio: number[]; sampleRate: number },
  ) {
    const sessionId = client.id;
    const session = this.sessions.get(sessionId);

    if (!session) {
      this.logger.warn(`No session found for audio: ${sessionId}`);
      return;
    }

    try {
      // Convert Float32Array to Int16Array PCM
      const float32Audio = new Float32Array(data.audio);
      const pcmAudio = processBrowserAudioToAsr(float32Audio, data.sampleRate);

      // Send to Deepgram
      this.deepgramService.sendAudioPCM(sessionId, pcmAudio);

      // Log audio received
      await this.ledgerService.logEvent(
        session.callId,
        LedgerEventType.AUDIO_RECEIVED,
        {
          samples: pcmAudio.length,
          sampleRate: 16000,
        },
      );
    } catch (error) {
      this.logger.error(`Error handling audio: ${error.message}`);
      await this.ledgerService.logEvent(
        session.callId,
        LedgerEventType.ERROR,
        { error: error.message, context: 'handleAudio' },
      );
    }
  }

  /**
   * Handle barge-in (user interrupts AI)
   */
  @SubscribeMessage('barge_in')
  async handleBargeIn(@ConnectedSocket() client: Socket) {
    const sessionId = client.id;
    const session = this.sessions.get(sessionId);

    if (!session) return;

    this.logger.log(`Barge-in detected: ${sessionId}`);

    // Clear audio queue
    session.audioQueue = [];
    session.isProcessing = false;

    await this.ledgerService.logEvent(
      session.callId,
      LedgerEventType.BARGE_IN,
      {},
    );

    // Emit event to client to stop playback
    client.emit('clear_audio');
  }

  /**
   * Setup Deepgram event handlers
   */
  private setupDeepgramHandlers(sessionId: string, eventEmitter: any) {
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

        // Emit to client
        this.server.to(sessionId).emit('transcript', {
          text: result.text,
          isFinal: result.isFinal,
        });

        // Process final transcripts
        if (result.isFinal && result.text.trim().length > 0) {
          session.lastTranscript = result.text;
          await this.processUserUtterance(sessionId, result.text);
        }
      } catch (error) {
        this.logger.error(`Error handling transcript: ${error.message}`);
      }
    });

    // Handle utterance end
    eventEmitter.on('utteranceEnd', async () => {
      this.logger.debug(`Utterance end: ${sessionId}`);
      // Could trigger response generation if needed
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
   * Process user utterance and generate response
   */
  private async processUserUtterance(sessionId: string, text: string) {
    const session = this.sessions.get(sessionId);
    if (!session || session.isProcessing) {
      return;
    }

    session.isProcessing = true;

    try {
      this.logger.log(`Processing utterance: "${text}"`);

      // Log AI processing start
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

      // Log AI response
      await this.ledgerService.logEvent(
        session.callId,
        LedgerEventType.AI_RESPONSE,
        { response },
      );

      // Send response
      await this.sendAIResponse(sessionId, response);
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
   * Generate speech and send to client
   */
  private async sendAIResponse(sessionId: string, text: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    try {
      this.logger.log(`Generating speech for: "${text}"`);

      await this.ledgerService.logEvent(
        session.callId,
        LedgerEventType.TTS_START,
        { text },
      );

      // Stream TTS audio chunks
      for await (const audioChunk of this.cartesiaService.generateSpeechStream(
        text,
      )) {
        // Convert to Float32 for browser
        const float32Audio = processTtsToBrowser(audioChunk);

        // Send to client
        this.server.to(sessionId).emit('audio', {
          audio: Array.from(float32Audio),
          sampleRate: 16000,
        });

        await this.ledgerService.logEvent(
          session.callId,
          LedgerEventType.TTS_CHUNK,
          { samples: audioChunk.length },
        );
      }

      await this.ledgerService.logEvent(
        session.callId,
        LedgerEventType.TTS_COMPLETE,
        { text },
      );

      // Emit TTS complete event
      this.server.to(sessionId).emit('tts_complete');
    } catch (error) {
      this.logger.error(`Error sending AI response: ${error.message}`);
      await this.ledgerService.logEvent(session.callId, LedgerEventType.ERROR, {
        error: error.message,
        context: 'sendAIResponse',
      });
    }
  }

  /**
   * Get session statistics
   */
  @SubscribeMessage('get_stats')
  async handleGetStats(@ConnectedSocket() client: Socket) {
    const sessionId = client.id;
    const session = this.sessions.get(sessionId);

    if (!session) {
      return { error: 'Session not found' };
    }

    const stats = await this.ledgerService.getCallStatistics(session.callId);
    return stats;
  }
}
