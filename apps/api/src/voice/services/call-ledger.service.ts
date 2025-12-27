import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * CallOS Event Types for Call Ledger
 */
export enum CallEventType {
  TRANSCRIPT_DELTA = 'transcript_delta',
  INTENT_UPDATE = 'intent_update',
  TOOL_INTENT = 'tool_intent',
  POLICY_DECISION = 'policy_decision',
  TOOL_RESULT = 'tool_result',
  ESCALATION = 'escalation',
  TAKEOVER = 'takeover',
  CALL_END = 'call_end',
}

export interface CallEventPayload {
  [key: string]: any;
}

export interface CreateCallEventDto {
  callId: string;
  eventType: CallEventType;
  payload: CallEventPayload;
  modelVersion?: string;
  latencyMs?: number;
}

/**
 * Call Ledger Service
 *
 * Implements append-only event store for complete audit trail
 * according to CallOS Governance & Audit Plane specification.
 *
 * Always Captured:
 * - Event Timeline: Transcript deltas, decisions, tool intents, policy decisions
 * - Model Lineage: Prompt version, model name, temperature, latency, cost
 * - Redaction Application: Which rules applied, what was masked
 * - Retention Policy: Per-field TTLs, geographic compliance
 */
@Injectable()
export class CallLedgerService {
  private readonly logger = new Logger(CallLedgerService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Log a call event to the append-only ledger
   * Events are never deleted, only redacted if necessary
   */
  async logEvent(dto: CreateCallEventDto): Promise<void> {
    const startTime = Date.now();

    try {
      await this.prisma.callEvent.create({
        data: {
          callId: dto.callId,
          eventType: dto.eventType,
          payload: JSON.stringify(dto.payload),
          modelVersion: dto.modelVersion,
          latencyMs: dto.latencyMs,
        },
      });

      const writeLatency = Date.now() - startTime;

      this.logger.debug(
        `Event logged: ${dto.eventType} for call ${dto.callId} (write latency: ${writeLatency}ms)`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to log event: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Log transcript delta (streaming ASR update)
   */
  async logTranscriptDelta(
    callId: string,
    words: string[],
    confidence: number,
  ): Promise<void> {
    await this.logEvent({
      callId,
      eventType: CallEventType.TRANSCRIPT_DELTA,
      payload: {
        words,
        confidence,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Log intent classification update
   */
  async logIntentUpdate(
    callId: string,
    intentDistribution: Record<string, number>,
    modelVersion: string,
    latencyMs: number,
  ): Promise<void> {
    await this.logEvent({
      callId,
      eventType: CallEventType.INTENT_UPDATE,
      payload: {
        intentDistribution,
        timestamp: new Date().toISOString(),
      },
      modelVersion,
      latencyMs,
    });
  }

  /**
   * Log tool invocation intent
   */
  async logToolIntent(
    callId: string,
    toolName: string,
    parameters: Record<string, any>,
    reasoning: string,
  ): Promise<void> {
    await this.logEvent({
      callId,
      eventType: CallEventType.TOOL_INTENT,
      payload: {
        toolName,
        parameters,
        reasoning,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Log policy engine decision
   */
  async logPolicyDecision(
    callId: string,
    toolName: string,
    decision: 'allow' | 'deny' | 'confirm_first',
    policyRule: string,
    trustTier: number,
    reasoning: string,
  ): Promise<void> {
    await this.logEvent({
      callId,
      eventType: CallEventType.POLICY_DECISION,
      payload: {
        toolName,
        decision,
        policyRule,
        trustTier,
        reasoning,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Log tool execution result
   */
  async logToolResult(
    callId: string,
    toolName: string,
    success: boolean,
    result: any,
    error?: string,
    latencyMs?: number,
  ): Promise<void> {
    await this.logEvent({
      callId,
      eventType: CallEventType.TOOL_RESULT,
      payload: {
        toolName,
        success,
        result: success ? result : undefined,
        error: error || undefined,
        timestamp: new Date().toISOString(),
      },
      latencyMs,
    });
  }

  /**
   * Log escalation to human
   */
  async logEscalation(
    callId: string,
    reason: string,
    triggerType: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.logEvent({
      callId,
      eventType: CallEventType.ESCALATION,
      payload: {
        reason,
        triggerType,
        metadata: metadata || {},
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Log human takeover
   */
  async logTakeover(
    callId: string,
    takenOverBy: string,
    contextProvided: Record<string, any>,
  ): Promise<void> {
    await this.logEvent({
      callId,
      eventType: CallEventType.TAKEOVER,
      payload: {
        takenOverBy,
        contextProvided,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Log call end with summary metrics
   */
  async logCallEnd(
    callId: string,
    duration: number,
    outcome: string,
    metrics: Record<string, any>,
  ): Promise<void> {
    await this.logEvent({
      callId,
      eventType: CallEventType.CALL_END,
      payload: {
        duration,
        outcome,
        metrics,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Get all events for a call (for audit explorer)
   */
  async getCallEvents(callId: string): Promise<any[]> {
    const events = await this.prisma.callEvent.findMany({
      where: { callId },
      orderBy: { timestamp: 'asc' },
    });

    return events.map((event) => ({
      ...event,
      payload: JSON.parse(event.payload),
    }));
  }

  /**
   * Get events by type for a call
   */
  async getCallEventsByType(
    callId: string,
    eventType: CallEventType,
  ): Promise<any[]> {
    const events = await this.prisma.callEvent.findMany({
      where: {
        callId,
        eventType,
      },
      orderBy: { timestamp: 'asc' },
    });

    return events.map((event) => ({
      ...event,
      payload: JSON.parse(event.payload),
    }));
  }

  /**
   * Get event timeline for audit explorer
   * Returns events with human-readable descriptions
   */
  async getEventTimeline(callId: string): Promise<any[]> {
    const events = await this.getCallEvents(callId);

    return events.map((event) => ({
      timestamp: event.timestamp,
      type: event.eventType,
      description: this.getEventDescription(event),
      payload: event.payload,
      modelVersion: event.modelVersion,
      latencyMs: event.latencyMs,
    }));
  }

  /**
   * Generate human-readable event description
   */
  private getEventDescription(event: any): string {
    const payload = event.payload;

    switch (event.eventType) {
      case CallEventType.TRANSCRIPT_DELTA:
        return `Transcribed: "${payload.words.join(' ')}" (confidence: ${(payload.confidence * 100).toFixed(1)}%)`;

      case CallEventType.INTENT_UPDATE:
        const topIntent = Object.entries(payload.intentDistribution)
          .sort(([, a], [, b]) => (b as number) - (a as number))[0];
        return `Intent updated: ${topIntent[0]} (${((topIntent[1] as number) * 100).toFixed(1)}%)`;

      case CallEventType.TOOL_INTENT:
        return `Agent wants to use tool: ${payload.toolName}`;

      case CallEventType.POLICY_DECISION:
        return `Policy decision: ${payload.decision} for ${payload.toolName} (tier ${payload.trustTier})`;

      case CallEventType.TOOL_RESULT:
        return `Tool ${payload.toolName} ${payload.success ? 'succeeded' : 'failed'}`;

      case CallEventType.ESCALATION:
        return `Escalated to human: ${payload.reason}`;

      case CallEventType.TAKEOVER:
        return `Call taken over by ${payload.takenOverBy}`;

      case CallEventType.CALL_END:
        return `Call ended: ${payload.outcome} (${payload.duration}s)`;

      default:
        return `Unknown event: ${event.eventType}`;
    }
  }

  /**
   * Get call event statistics for observability
   */
  async getCallStatistics(callId: string): Promise<Record<string, any>> {
    const events = await this.getCallEvents(callId);

    const stats = {
      totalEvents: events.length,
      eventsByType: {} as Record<string, number>,
      averageLatency: 0,
      toolInvocations: 0,
      policyChecks: 0,
      escalations: 0,
    };

    let totalLatency = 0;
    let latencyCount = 0;

    for (const event of events) {
      // Count by type
      stats.eventsByType[event.eventType] = (stats.eventsByType[event.eventType] || 0) + 1;

      // Track latency
      if (event.latencyMs) {
        totalLatency += event.latencyMs;
        latencyCount++;
      }

      // Count specific event types
      if (event.eventType === CallEventType.TOOL_RESULT) {
        stats.toolInvocations++;
      }
      if (event.eventType === CallEventType.POLICY_DECISION) {
        stats.policyChecks++;
      }
      if (event.eventType === CallEventType.ESCALATION) {
        stats.escalations++;
      }
    }

    stats.averageLatency = latencyCount > 0 ? totalLatency / latencyCount : 0;

    return stats;
  }
}
