import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { Config } from '../../config/config.schema';

export enum LedgerEventType {
  CALL_STARTED = 'call_started',
  CALL_ENDED = 'call_ended',
  AUDIO_RECEIVED = 'audio_received',
  TRANSCRIPT_PARTIAL = 'transcript_partial',
  TRANSCRIPT_FINAL = 'transcript_final',
  AI_PROCESSING_START = 'ai_processing_start',
  AI_PROCESSING_COMPLETE = 'ai_processing_complete',
  AI_RESPONSE = 'ai_response',
  TTS_START = 'tts_start',
  TTS_CHUNK = 'tts_chunk',
  TTS_COMPLETE = 'tts_complete',
  AUDIO_SENT = 'audio_sent',
  ERROR = 'error',
  BARGE_IN = 'barge_in',
  SILENCE_DETECTED = 'silence_detected',
}

interface LedgerEventPayload {
  [key: string]: any;
}

@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);
  private readonly enableLogging: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<Config>,
  ) {
    this.enableLogging = this.configService.get('ENABLE_EVENT_LOGGING', { infer: true });
  }

  /**
   * Log an event to the ledger for audit trail and debugging
   */
  async logEvent(
    callId: string,
    eventType: LedgerEventType,
    payload: LedgerEventPayload,
  ): Promise<void> {
    if (!this.enableLogging) {
      return;
    }

    try {
      await this.prisma.ledgerEvent.create({
        data: {
          callId,
          eventType,
          payload: JSON.stringify(payload),
        },
      });

      // Also log to console in debug mode
      if (this.configService.get('LOG_LEVEL') === 'debug') {
        this.logger.debug(
          `[${callId}] ${eventType}: ${JSON.stringify(payload)}`,
        );
      }
    } catch (error) {
      // Don't throw errors from logging - just log them
      this.logger.error(`Failed to log event: ${error.message}`, error.stack);
    }
  }

  /**
   * Get all events for a call session
   */
  async getCallEvents(callId: string) {
    return this.prisma.ledgerEvent.findMany({
      where: { callId },
      orderBy: { timestamp: 'asc' },
    });
  }

  /**
   * Get events by type for a call
   */
  async getCallEventsByType(callId: string, eventType: LedgerEventType) {
    return this.prisma.ledgerEvent.findMany({
      where: {
        callId,
        eventType,
      },
      orderBy: { timestamp: 'asc' },
    });
  }

  /**
   * Get the full conversation transcript from ledger events
   */
  async getConversationTranscript(callId: string): Promise<Array<{
    timestamp: Date;
    speaker: 'user' | 'ai';
    text: string;
  }>> {
    const events = await this.prisma.ledgerEvent.findMany({
      where: {
        callId,
        eventType: {
          in: [LedgerEventType.TRANSCRIPT_FINAL, LedgerEventType.AI_RESPONSE],
        },
      },
      orderBy: { timestamp: 'asc' },
    });

    return events.map((event) => {
      const payload = JSON.parse(event.payload);
      return {
        timestamp: event.timestamp,
        speaker: event.eventType === LedgerEventType.TRANSCRIPT_FINAL ? 'user' : 'ai',
        text: payload.text || payload.response || '',
      };
    });
  }

  /**
   * Calculate call statistics from ledger events
   */
  async getCallStatistics(callId: string) {
    const events = await this.getCallEvents(callId);

    const eventCounts = events.reduce((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const startEvent = events.find(e => e.eventType === LedgerEventType.CALL_STARTED);
    const endEvent = events.find(e => e.eventType === LedgerEventType.CALL_ENDED);

    const durationMs = startEvent && endEvent
      ? endEvent.timestamp.getTime() - startEvent.timestamp.getTime()
      : null;

    return {
      totalEvents: events.length,
      eventCounts,
      durationMs,
      durationSeconds: durationMs ? Math.floor(durationMs / 1000) : null,
      bargeInCount: eventCounts[LedgerEventType.BARGE_IN] || 0,
      errorCount: eventCounts[LedgerEventType.ERROR] || 0,
    };
  }
}
