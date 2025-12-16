import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, LiveTranscriptionEvents, LiveClient } from '@deepgram/sdk';
import { Config } from '../../config/config.schema';
import { EventEmitter } from 'events';

export interface TranscriptResult {
  text: string;
  isFinal: boolean;
  confidence: number;
  words?: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
  }>;
}

/**
 * Deepgram Streaming ASR Service
 * Handles real-time speech-to-text transcription
 */
@Injectable()
export class DeepgramService implements OnModuleDestroy {
  private readonly logger = new Logger(DeepgramService.name);
  private readonly deepgram: any;
  private readonly activeSessions = new Map<string, LiveClient>();

  constructor(private readonly configService: ConfigService<Config>) {
    const apiKey = this.configService.get('DEEPGRAM_API_KEY', { infer: true });
    this.deepgram = createClient(apiKey);
    this.logger.log('Deepgram service initialized');
  }

  /**
   * Create a new streaming transcription session
   */
  async createStreamingSession(sessionId: string): Promise<{
    connection: LiveClient;
    eventEmitter: EventEmitter;
  }> {
    this.logger.log(`Creating Deepgram streaming session: ${sessionId}`);

    const eventEmitter = new EventEmitter();
    const language = this.configService.get('VOICE_LANGUAGE', { infer: true });

    try {
      // Create live transcription connection
      const connection = this.deepgram.listen.live({
        model: 'nova-2',
        language: language,
        smart_format: true,
        encoding: 'linear16',
        sample_rate: 16000,
        channels: 1,
        interim_results: true,
        utterance_end_ms: 1000,
        vad_events: true,
        endpointing: 300,
      });

      // Handle connection open
      connection.on(LiveTranscriptionEvents.Open, () => {
        this.logger.log(`[${sessionId}] Deepgram connection opened`);
        eventEmitter.emit('open');
      });

      // Handle transcription results
      connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
        const channel = data.channel;
        const alternative = channel?.alternatives?.[0];

        if (alternative) {
          const result: TranscriptResult = {
            text: alternative.transcript,
            isFinal: data.is_final || false,
            confidence: alternative.confidence || 0,
            words: alternative.words,
          };

          // Only emit if there's actual text
          if (result.text && result.text.trim().length > 0) {
            this.logger.debug(
              `[${sessionId}] Transcript (${result.isFinal ? 'final' : 'partial'}): ${result.text}`,
            );
            eventEmitter.emit('transcript', result);
          }
        }
      });

      // Handle utterance end (user stopped speaking)
      connection.on(LiveTranscriptionEvents.UtteranceEnd, () => {
        this.logger.debug(`[${sessionId}] Utterance end detected`);
        eventEmitter.emit('utteranceEnd');
      });

      // Handle VAD (Voice Activity Detection) events
      connection.on(LiveTranscriptionEvents.SpeechStarted, () => {
        this.logger.debug(`[${sessionId}] Speech started`);
        eventEmitter.emit('speechStarted');
      });

      // Handle metadata
      connection.on(LiveTranscriptionEvents.Metadata, (data: any) => {
        this.logger.debug(`[${sessionId}] Metadata received`);
      });

      // Handle errors
      connection.on(LiveTranscriptionEvents.Error, (error: any) => {
        this.logger.error(`[${sessionId}] Deepgram error:`, error);
        eventEmitter.emit('error', error);
      });

      // Handle connection close
      connection.on(LiveTranscriptionEvents.Close, () => {
        this.logger.log(`[${sessionId}] Deepgram connection closed`);
        this.activeSessions.delete(sessionId);
        eventEmitter.emit('close');
      });

      // Store active session
      this.activeSessions.set(sessionId, connection);

      return { connection, eventEmitter };
    } catch (error) {
      this.logger.error(`Failed to create Deepgram session: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Send audio chunk to Deepgram for transcription
   */
  sendAudio(sessionId: string, audioChunk: Buffer): void {
    const connection = this.activeSessions.get(sessionId);
    if (!connection) {
      this.logger.warn(`No active Deepgram session found for: ${sessionId}`);
      return;
    }

    try {
      connection.send(audioChunk);
    } catch (error) {
      this.logger.error(`Failed to send audio to Deepgram: ${error.message}`);
    }
  }

  /**
   * Send audio data as Int16Array
   */
  sendAudioPCM(sessionId: string, pcmData: Int16Array): void {
    const buffer = Buffer.from(pcmData.buffer);
    this.sendAudio(sessionId, buffer);
  }

  /**
   * Finish sending audio and close the stream
   */
  async finishStream(sessionId: string): Promise<void> {
    const connection = this.activeSessions.get(sessionId);
    if (!connection) {
      this.logger.warn(`No active session to finish: ${sessionId}`);
      return;
    }

    try {
      this.logger.log(`Finishing Deepgram stream: ${sessionId}`);
      connection.finish();
      this.activeSessions.delete(sessionId);
    } catch (error) {
      this.logger.error(`Error finishing stream: ${error.message}`);
    }
  }

  /**
   * Close a specific session
   */
  async closeSession(sessionId: string): Promise<void> {
    await this.finishStream(sessionId);
  }

  /**
   * Get active session count
   */
  getActiveSessionCount(): number {
    return this.activeSessions.size;
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy() {
    this.logger.log('Cleaning up Deepgram sessions...');
    const sessionIds = Array.from(this.activeSessions.keys());
    for (const sessionId of sessionIds) {
      await this.closeSession(sessionId);
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Simple check - verify we can create a client
      return !!this.deepgram;
    } catch (error) {
      this.logger.error('Deepgram health check failed:', error);
      return false;
    }
  }
}
