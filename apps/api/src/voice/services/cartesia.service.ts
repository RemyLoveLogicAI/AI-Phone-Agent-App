import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Config } from '../../config/config.schema';
import Cartesia from '@cartesia/cartesia-js';

/**
 * Cartesia TTS Service
 * Ultra-low latency text-to-speech with streaming support
 */
@Injectable()
export class CartesiaService {
  private readonly logger = new Logger(CartesiaService.name);
  private readonly cartesia: Cartesia;
  private readonly voiceId: string;

  constructor(private readonly configService: ConfigService<Config>) {
    const apiKey = this.configService.get('CARTESIA_API_KEY', { infer: true });
    this.voiceId = this.configService.get('CARTESIA_VOICE_ID', { infer: true });

    this.cartesia = new Cartesia({
      apiKey: apiKey,
    });

    this.logger.log('Cartesia TTS service initialized');
  }

  /**
   * Generate speech from text with streaming
   * Returns async generator that yields audio chunks
   */
  async *generateSpeechStream(
    text: string,
    options?: {
      voiceId?: string;
      modelId?: string;
      language?: string;
    },
  ): AsyncGenerator<Int16Array> {
    const voiceId = options?.voiceId || this.voiceId;
    const modelId = options?.modelId || 'sonic-english';
    const language = options?.language || this.configService.get('VOICE_LANGUAGE', { infer: true });

    this.logger.debug(`Generating speech for text: "${text.substring(0, 50)}..."`);

    try {
      // Create WebSocket connection for streaming
      const response = await this.cartesia.tts.bytes({
        modelId: modelId,
        voice: {
          mode: 'id',
          id: voiceId,
        },
        transcript: text,
        language: language,
        outputFormat: {
          container: 'raw',
          encoding: 'pcm_s16le',
          sampleRate: 16000,
        },
      });

      // Stream audio chunks
      for await (const chunk of response) {
        // Convert chunk to Int16Array
        const audioData = new Int16Array(
          chunk.buffer,
          chunk.byteOffset,
          chunk.byteLength / 2,
        );
        yield audioData;
      }

      this.logger.debug(`Speech generation complete for: "${text.substring(0, 50)}..."`);
    } catch (error) {
      this.logger.error(`Cartesia TTS error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Generate speech from text (non-streaming)
   * Returns complete audio buffer
   */
  async generateSpeech(
    text: string,
    options?: {
      voiceId?: string;
      modelId?: string;
      language?: string;
    },
  ): Promise<Int16Array> {
    const chunks: Int16Array[] = [];

    for await (const chunk of this.generateSpeechStream(text, options)) {
      chunks.push(chunk);
    }

    // Concatenate all chunks
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Int16Array(totalLength);
    let offset = 0;

    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result;
  }

  /**
   * List available voices
   */
  async listVoices() {
    try {
      const voices = await this.cartesia.voices.list();
      return voices;
    } catch (error) {
      this.logger.error(`Failed to list voices: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get voice by ID
   */
  async getVoice(voiceId?: string) {
    const id = voiceId || this.voiceId;
    try {
      const voice = await this.cartesia.voices.get(id);
      return voice;
    } catch (error) {
      this.logger.error(`Failed to get voice ${id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try to get the configured voice to verify connection
      await this.getVoice();
      return true;
    } catch (error) {
      this.logger.error('Cartesia health check failed:', error);
      return false;
    }
  }
}
