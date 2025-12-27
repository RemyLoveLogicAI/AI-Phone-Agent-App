import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CallLedgerService } from './call-ledger.service';

/**
 * Intelligence Pack Schema (from CallOS spec)
 */
export interface IntelligencePack {
  callId: string;
  durationSeconds: number;

  summary: {
    whatHappened: string;
    whatTheyWant: string;
    whatWeDid: string;
    whatYouShouldDo: string;
    riskFlags: string[];
  };

  entities: {
    callerName?: string;
    company?: string;
    email?: string;
    phoneNumber?: string;
    budgetRange?: string;
    timeline?: string;
    [key: string]: any;
  };

  trustScore: number;

  intentDistribution: Record<string, number>;

  actionsTaken: Array<{
    type: string;
    content?: string;
    timestamp: string;
  }>;

  suggestedFollowups: Array<{
    type: string;
    params?: Record<string, any>;
    priority?: number;
  }>;

  auditTrail: {
    decisions: number;
    policyChecks: number;
    toolsInvoked: number;
  };
}

/**
 * Intelligence Pack Service
 *
 * Generates comprehensive post-call intelligence pack within 30 seconds
 * of call end, according to CallOS specification.
 *
 * Delivery Channels:
 * - Push Notification: Summary + one-tap actions
 * - Email Digest: Full pack with expandable sections
 * - Dashboard Card: Real-time update in Mission Control
 * - Voice Capsule: 30-second audio summary (optional)
 * - API Webhook: For CRM/ticketing integration
 */
@Injectable()
export class IntelligencePackService {
  private readonly logger = new Logger(IntelligencePackService.name);
  private readonly TARGET_GENERATION_TIME_MS = 30000; // 30 seconds

  constructor(
    private prisma: PrismaService,
    private callLedger: CallLedgerService,
  ) {}

  /**
   * Generate intelligence pack for a completed call
   * Target: <30s generation time
   */
  async generateIntelligencePack(callId: string): Promise<IntelligencePack> {
    const startTime = Date.now();

    try {
      this.logger.log(`Generating intelligence pack for call: ${callId}`);

      // Fetch call data
      const call = await this.prisma.call.findUnique({
        where: { id: callId },
        include: {
          contact: true,
          playbook: true,
        },
      });

      if (!call) {
        throw new Error(`Call not found: ${callId}`);
      }

      // Get call events from ledger
      const events = await this.callLedger.getCallEvents(callId);

      // Get call statistics
      const stats = await this.callLedger.getCallStatistics(callId);

      // Generate all sections in parallel for speed
      const [summary, entities, intentDist, actions, followups] =
        await Promise.all([
          this.generateSummary(call, events),
          this.extractEntities(call, events),
          this.computeIntentDistribution(call, events),
          this.extractActionsTaken(events),
          this.generateFollowupSuggestions(call, events),
        ]);

      const intelligencePack: IntelligencePack = {
        callId,
        durationSeconds: call.duration || 0,
        summary,
        entities,
        trustScore: call.trustScoreAtEnd,
        intentDistribution: intentDist,
        actionsTaken: actions,
        suggestedFollowups: followups,
        auditTrail: {
          decisions: stats.eventsByType.policy_decision || 0,
          policyChecks: stats.policyChecks,
          toolsInvoked: stats.toolInvocations,
        },
      };

      // Save to database
      await this.saveIntelligencePack(intelligencePack);

      const generationTime = Date.now() - startTime;

      this.logger.log(
        `Intelligence pack generated in ${generationTime}ms (target: <${this.TARGET_GENERATION_TIME_MS}ms)`,
      );

      if (generationTime > this.TARGET_GENERATION_TIME_MS) {
        this.logger.warn(
          `Intelligence pack generation exceeded target time by ${generationTime - this.TARGET_GENERATION_TIME_MS}ms`,
        );
      }

      return intelligencePack;
    } catch (error) {
      this.logger.error(
        `Failed to generate intelligence pack: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Generate the 4-part summary
   */
  private async generateSummary(
    call: any,
    events: any[],
  ): Promise<IntelligencePack['summary']> {
    const transcript = call.transcript || '';
    const scamConfidence = call.scamConfidence || 0;

    // Extract what happened
    let whatHappened = 'Incoming call received';

    if (transcript.length > 0) {
      // TODO: Use GPT-4 to generate concise summary
      whatHappened = this.summarizeTranscript(transcript);
    }

    // Extract what they want
    let whatTheyWant = 'Intent unclear';

    const intentEvents = events.filter((e) => e.eventType === 'intent_update');
    if (intentEvents.length > 0) {
      const latestIntent = intentEvents[intentEvents.length - 1];
      const topIntent = this.getTopIntent(
        latestIntent.payload.intentDistribution,
      );
      whatTheyWant = this.intentToHumanReadable(topIntent);
    }

    // Extract what we did
    const whatWeDid = this.summarizeActions(events);

    // Determine what owner should do
    const whatYouShouldDo = this.generateRecommendation(call, events);

    // Risk flags
    const riskFlags: string[] = [];

    if (scamConfidence > 0.7) {
      riskFlags.push('high_scam_confidence');
    }

    if (call.wasEscalated) {
      riskFlags.push('escalated_to_human');
    }

    const complianceEvents = events.filter((e) =>
      e.payload.complianceTriggers,
    );
    if (complianceEvents.length > 0) {
      riskFlags.push('compliance_triggers_detected');
    }

    return {
      whatHappened,
      whatTheyWant,
      whatWeDid,
      whatYouShouldDo,
      riskFlags: riskFlags.length > 0 ? riskFlags : ['none'],
    };
  }

  /**
   * Extract entities from call
   */
  private async extractEntities(call: any, events: any[]): Promise<any> {
    const entities: any = {};

    // Get from contact if available
    if (call.contact) {
      if (call.contact.name) entities.callerName = call.contact.name;
      if (call.contact.email) entities.email = call.contact.email;
      if (call.contact.phoneNumber)
        entities.phoneNumber = call.contact.phoneNumber;
    }

    // Extract from transcript events
    const transcriptEvents = events.filter(
      (e) => e.eventType === 'transcript_delta',
    );

    for (const event of transcriptEvents) {
      const payload = event.payload;
      // TODO: Use NER to extract entities from transcript
      // For now, simple placeholder
    }

    return entities;
  }

  /**
   * Compute final intent distribution
   */
  private async computeIntentDistribution(
    call: any,
    events: any[],
  ): Promise<Record<string, number>> {
    if (call.intentDistribution) {
      return JSON.parse(call.intentDistribution);
    }

    // Get latest intent update from events
    const intentEvents = events.filter((e) => e.eventType === 'intent_update');

    if (intentEvents.length > 0) {
      const latest = intentEvents[intentEvents.length - 1];
      return latest.payload.intentDistribution;
    }

    return { unknown: 1.0 };
  }

  /**
   * Extract actions taken during call
   */
  private extractActionsTaken(events: any[]): IntelligencePack['actionsTaken'] {
    const toolResults = events.filter((e) => e.eventType === 'tool_result');

    return toolResults
      .filter((e) => e.payload.success)
      .map((e) => ({
        type: e.payload.toolName,
        content: e.payload.result?.message || undefined,
        timestamp: e.timestamp,
      }));
  }

  /**
   * Generate followup action suggestions
   */
  private async generateFollowupSuggestions(
    call: any,
    events: any[],
  ): Promise<IntelligencePack['suggestedFollowups']> {
    const suggestions: IntelligencePack['suggestedFollowups'] = [];

    // If no appointment was scheduled, suggest scheduling
    const appointmentActions = events.filter(
      (e) =>
        e.eventType === 'tool_result' &&
        e.payload.toolName === 'schedule_appointment',
    );

    if (appointmentActions.length === 0) {
      // Check if appointment was discussed
      const transcript = call.transcript || '';
      if (
        transcript.toLowerCase().includes('schedule') ||
        transcript.toLowerCase().includes('appointment')
      ) {
        suggestions.push({
          type: 'calendar_hold',
          params: {
            // Would extract from transcript
          },
          priority: 1,
        });
      }
    }

    // Suggest email follow-up if no email was sent
    const emailActions = events.filter(
      (e) =>
        e.eventType === 'tool_result' && e.payload.toolName === 'send_email',
    );

    if (emailActions.length === 0) {
      suggestions.push({
        type: 'email_draft',
        priority: 2,
      });
    }

    return suggestions;
  }

  /**
   * Save intelligence pack to database
   */
  private async saveIntelligencePack(
    pack: IntelligencePack,
  ): Promise<void> {
    const startTime = Date.now();

    await this.prisma.intelligencePack.create({
      data: {
        callId: pack.callId,
        whatHappened: pack.summary.whatHappened,
        whatTheyWant: pack.summary.whatTheyWant,
        whatWeDid: pack.summary.whatWeDid,
        whatYouShouldDo: pack.summary.whatYouShouldDo,
        riskFlags: JSON.stringify(pack.summary.riskFlags),
        entities: JSON.stringify(pack.entities),
        intentDistribution: JSON.stringify(pack.intentDistribution),
        actionsTaken: JSON.stringify(pack.actionsTaken),
        suggestedFollowups: JSON.stringify(pack.suggestedFollowups),
        auditSummary: JSON.stringify(pack.auditTrail),
        processingTimeMs: Date.now() - startTime,
      },
    });
  }

  /**
   * Get intelligence pack by call ID
   */
  async getIntelligencePack(callId: string): Promise<IntelligencePack | null> {
    const pack = await this.prisma.intelligencePack.findUnique({
      where: { callId },
      include: {
        call: {
          include: {
            contact: true,
          },
        },
      },
    });

    if (!pack) {
      return null;
    }

    return {
      callId: pack.callId,
      durationSeconds: pack.call.duration || 0,
      summary: {
        whatHappened: pack.whatHappened,
        whatTheyWant: pack.whatTheyWant,
        whatWeDid: pack.whatWeDid,
        whatYouShouldDo: pack.whatYouShouldDo,
        riskFlags: JSON.parse(pack.riskFlags),
      },
      entities: JSON.parse(pack.entities),
      trustScore: pack.call.trustScoreAtEnd,
      intentDistribution: JSON.parse(pack.intentDistribution),
      actionsTaken: JSON.parse(pack.actionsTaken),
      suggestedFollowups: JSON.parse(pack.suggestedFollowups),
      auditTrail: JSON.parse(pack.auditSummary),
    };
  }

  // Helper methods

  private summarizeTranscript(transcript: string): string {
    // TODO: Use GPT-4 for actual summarization
    return transcript.length > 100
      ? transcript.substring(0, 100) + '...'
      : transcript;
  }

  private getTopIntent(distribution: Record<string, number>): string {
    return Object.entries(distribution).sort(([, a], [, b]) => b - a)[0]?.[0] ||
      'unknown';
  }

  private intentToHumanReadable(intent: string): string {
    const map: Record<string, string> = {
      sales: 'Inquiring about products or services',
      support: 'Seeking help or support',
      appointment: 'Schedule an appointment',
      information: 'Requesting information',
      complaint: 'Filing a complaint',
      spam: 'Likely spam or scam',
    };

    return map[intent] || 'Intent unclear';
  }

  private summarizeActions(events: any[]): string {
    const toolResults = events.filter(
      (e) => e.eventType === 'tool_result' && e.payload.success,
    );

    if (toolResults.length === 0) {
      return 'No actions taken';
    }

    const actionDescriptions = toolResults.map((e) => {
      const toolName = e.payload.toolName;
      return toolName.replace(/_/g, ' ');
    });

    return actionDescriptions.join(', ');
  }

  private generateRecommendation(call: any, events: any[]): string {
    // If escalated, recommend immediate attention
    if (call.wasEscalated) {
      return `Review and follow up: ${call.escalationReason || 'escalated by agent'}`;
    }

    // If high scam confidence, recommend blocking
    if (call.scamConfidence > 0.8) {
      return 'Consider blocking this number - high scam confidence';
    }

    // If positive interaction, recommend follow-up
    const transcript = call.transcript || '';
    if (transcript.toLowerCase().includes('thank')) {
      return 'Positive interaction - consider follow-up to build relationship';
    }

    return 'Review call and determine next steps';
  }
}
