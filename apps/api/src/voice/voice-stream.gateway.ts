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
import { Server, WebSocket } from 'ws';

interface TwilioMediaMessage {
  event: 'connected' | 'start' | 'media' | 'stop' | 'mark';
  streamSid?: string;
  start?: {
    streamSid: string;
    accountSid: string;
    callSid: string;
    tracks: string[];
    mediaFormat: {
      encoding: string;
      sampleRate: number;
      channels: number;
    };
  };
  media?: {
    track: string;
    chunk: string;
    timestamp: string;
    payload: string; // Base64 encoded μ-law audio
  };
  mark?: {
    name: string;
  };
}

interface CallSession {
  callSid: string;
  streamSid: string;
  startTime: Date;
  isPlaying: boolean;
  audioBuffer: Buffer[];
  transcript: string[];
  lastSpeechTime: Date | null;
}

/**
 * CallOS Realtime Interaction Plane - WebSocket Gateway
 *
 * Handles bidirectional audio streaming via Twilio Media Streams
 * Target latency: <400ms end-to-end response
 * Supports barge-in with <900ms detection and response
 */
@WebSocketGateway({ path: '/voice/stream' })
export class VoiceStreamGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(VoiceStreamGateway.name);
  private activeSessions: Map<string, CallSession> = new Map();
  private jitterBuffers: Map<string, Buffer[]> = new Map();

  // Configuration constants from CallOS spec
  private readonly TARGET_JITTER_MS = 20;
  private readonly MAX_JITTER_MS = 100;
  private readonly BARGE_IN_TARGET_MS = 900;

  handleConnection(client: WebSocket, ...args: any[]) {
    this.logger.log('WebSocket client connected');
  }

  handleDisconnect(client: WebSocket) {
    // Clean up session on disconnect
    for (const [streamSid, session] of this.activeSessions.entries()) {
      this.logger.log(`WebSocket client disconnected. Cleaning up session: ${session.callSid}`);
      this.cleanupSession(streamSid);
    }
  }

  @SubscribeMessage('message')
  async handleMessage(
    @MessageBody() data: string,
    @ConnectedSocket() client: WebSocket,
  ): Promise<void> {
    try {
      const message: TwilioMediaMessage = JSON.parse(data);

      switch (message.event) {
        case 'connected':
          this.handleConnected(client);
          break;

        case 'start':
          this.handleStart(client, message);
          break;

        case 'media':
          await this.handleMedia(client, message);
          break;

        case 'stop':
          this.handleStop(client, message);
          break;

        case 'mark':
          this.handleMark(client, message);
          break;

        default:
          this.logger.warn(`Unknown event type: ${message.event}`);
      }
    } catch (error) {
      this.logger.error(`Error handling message: ${error.message}`, error.stack);
    }
  }

  /**
   * Handle WebSocket connection established
   */
  private handleConnected(client: WebSocket): void {
    this.logger.log('Twilio Media Stream connected');
  }

  /**
   * Handle stream start - initialize call session
   */
  private handleStart(client: WebSocket, message: TwilioMediaMessage): void {
    const { streamSid, accountSid, callSid, mediaFormat } = message.start;

    this.logger.log(`Stream started - CallSid: ${callSid}, StreamSid: ${streamSid}`);
    this.logger.debug(`Media format: ${JSON.stringify(mediaFormat)}`);

    // Initialize call session
    const session: CallSession = {
      callSid,
      streamSid,
      startTime: new Date(),
      isPlaying: false,
      audioBuffer: [],
      transcript: [],
      lastSpeechTime: null,
    };

    this.activeSessions.set(streamSid, session);
    this.jitterBuffers.set(streamSid, []);

    // Send initial greeting (will be replaced with OpenAI Realtime API)
    this.sendGreeting(client, streamSid);
  }

  /**
   * Handle incoming audio media
   * Pipeline: Jitter Buffer → VAD → ASR → Shadow Brain → LLM → TTS → Out
   */
  private async handleMedia(
    client: WebSocket,
    message: TwilioMediaMessage,
  ): Promise<void> {
    const { payload, timestamp } = message.media;
    const streamSid = message.streamSid;
    const session = this.activeSessions.get(streamSid);

    if (!session) {
      this.logger.warn(`No session found for streamSid: ${streamSid}`);
      return;
    }

    // Decode base64 μ-law audio payload
    const audioChunk = Buffer.from(payload, 'base64');

    // Add to jitter buffer
    const buffer = this.jitterBuffers.get(streamSid);
    buffer.push(audioChunk);

    // Detect speech during TTS playback for barge-in
    if (session.isPlaying) {
      const isSpeech = await this.detectSpeech(audioChunk);

      if (isSpeech) {
        const bargeInStartTime = Date.now();

        // IMMEDIATELY stop playback using Twilio's 'clear' semantics
        this.clearAudioPlayback(client, streamSid);
        session.isPlaying = false;

        const bargeInLatency = Date.now() - bargeInStartTime;
        this.logger.log(`Barge-in detected! Latency: ${bargeInLatency}ms (target: <${this.BARGE_IN_TARGET_MS}ms)`);

        // Send acknowledgment phrase
        await this.sendAcknowledgment(client, streamSid);
      }
    }

    // Process audio buffer when sufficient data accumulated
    if (buffer.length >= 10) { // ~200ms of audio at 20ms chunks
      const audioData = Buffer.concat(buffer.splice(0, 10));

      // TODO: Send to ASR service (Whisper/Deepgram)
      // TODO: Send transcript to Shadow Brain for parallel analysis
      // TODO: Generate LLM response
      // TODO: Synthesize TTS and stream back
    }
  }

  /**
   * Handle stream stop - cleanup session
   */
  private handleStop(client: WebSocket, message: TwilioMediaMessage): void {
    const streamSid = message.streamSid;
    const session = this.activeSessions.get(streamSid);

    if (session) {
      this.logger.log(`Stream stopped - CallSid: ${session.callSid}`);
      this.cleanupSession(streamSid);
    }
  }

  /**
   * Handle mark event - for timing and synchronization
   */
  private handleMark(client: WebSocket, message: TwilioMediaMessage): void {
    this.logger.debug(`Mark received: ${message.mark.name}`);
  }

  /**
   * Send initial greeting to caller
   * TODO: Replace with OpenAI Realtime API or TTS service
   */
  private sendGreeting(client: WebSocket, streamSid: string): void {
    const session = this.activeSessions.get(streamSid);
    if (!session) return;

    session.isPlaying = true;

    // Send TwiML to play greeting
    // Note: In production, this will be replaced with streaming TTS
    const greeting = {
      event: 'media',
      streamSid,
      media: {
        payload: '', // Base64 encoded μ-law audio (empty for now)
      },
    };

    // client.send(JSON.stringify(greeting));

    // For now, just log
    this.logger.log('Greeting sent (placeholder)');
  }

  /**
   * Clear audio playback buffer (for barge-in)
   * Uses Twilio's 'clear' event to stop buffered audio instantly
   */
  private clearAudioPlayback(client: WebSocket, streamSid: string): void {
    const clearEvent = {
      event: 'clear',
      streamSid,
    };

    client.send(JSON.stringify(clearEvent));
    this.logger.debug(`Audio playback cleared for streamSid: ${streamSid}`);
  }

  /**
   * Send acknowledgment phrase after barge-in
   */
  private async sendAcknowledgment(
    client: WebSocket,
    streamSid: string,
  ): Promise<void> {
    // TODO: Generate quick acknowledgment TTS
    // Example: "Yes?", "I'm listening", "Go ahead"
    this.logger.debug('Acknowledgment sent (placeholder)');
  }

  /**
   * Detect speech in audio chunk using Voice Activity Detection (VAD)
   * TODO: Implement proper VAD (e.g., WebRTC VAD, Silero VAD)
   */
  private async detectSpeech(audioChunk: Buffer): Promise<boolean> {
    // Placeholder implementation
    // In production, use VAD library to detect speech vs silence
    // Check energy level, zero-crossing rate, etc.

    // Simple energy-based detection (very basic placeholder)
    const samples = new Int16Array(audioChunk.buffer);
    let energy = 0;

    for (let i = 0; i < samples.length; i++) {
      energy += Math.abs(samples[i]);
    }

    const avgEnergy = energy / samples.length;
    const SPEECH_THRESHOLD = 100; // Tune this value

    return avgEnergy > SPEECH_THRESHOLD;
  }

  /**
   * Cleanup session resources
   */
  private cleanupSession(streamSid: string): void {
    this.activeSessions.delete(streamSid);
    this.jitterBuffers.delete(streamSid);
    this.logger.debug(`Session cleaned up: ${streamSid}`);
  }

  /**
   * Get active sessions count (for observability)
   */
  getActiveSessionsCount(): number {
    return this.activeSessions.size;
  }

  /**
   * Get session by stream SID
   */
  getSession(streamSid: string): CallSession | undefined {
    return this.activeSessions.get(streamSid);
  }
}
