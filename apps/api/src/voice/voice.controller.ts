import { Controller, Post, Get, Body, Param, Query, Logger } from '@nestjs/common';
import { VoiceStreamGateway } from './voice-stream.gateway';
import { CallLedgerService } from './services/call-ledger.service';
import { TrustScoringService } from './services/trust-scoring.service';
import { IntelligencePackService } from './services/intelligence-pack.service';
import { PolicyEngineService } from './services/policy-engine.service';

/**
 * CallOS Voice Controller
 *
 * HTTP endpoints for voice system management and monitoring
 */
@Controller('voice')
export class VoiceController {
  private readonly logger = new Logger(VoiceController.name);

  constructor(
    private voiceGateway: VoiceStreamGateway,
    private callLedger: CallLedgerService,
    private trustScoring: TrustScoringService,
    private intelligencePack: IntelligencePackService,
    private policyEngine: PolicyEngineService,
  ) {}

  /**
   * Health check endpoint
   */
  @Get('health')
  async healthCheck() {
    return {
      status: 'ok',
      activeSessions: this.voiceGateway.getActiveSessionsCount(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get active voice sessions
   */
  @Get('sessions')
  async getActiveSessions() {
    return {
      count: this.voiceGateway.getActiveSessionsCount(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get call events (audit trail)
   */
  @Get('calls/:callId/events')
  async getCallEvents(@Param('callId') callId: string) {
    const events = await this.callLedger.getCallEvents(callId);
    return {
      callId,
      events,
      count: events.length,
    };
  }

  /**
   * Get call event timeline (for audit explorer)
   */
  @Get('calls/:callId/timeline')
  async getCallTimeline(@Param('callId') callId: string) {
    const timeline = await this.callLedger.getEventTimeline(callId);
    return {
      callId,
      timeline,
    };
  }

  /**
   * Get call statistics
   */
  @Get('calls/:callId/stats')
  async getCallStats(@Param('callId') callId: string) {
    const stats = await this.callLedger.getCallStatistics(callId);
    return {
      callId,
      stats,
    };
  }

  /**
   * Get intelligence pack for a call
   */
  @Get('calls/:callId/intelligence')
  async getIntelligencePack(@Param('callId') callId: string) {
    const pack = await this.intelligencePack.getIntelligencePack(callId);

    if (!pack) {
      return {
        error: 'Intelligence pack not found',
        callId,
      };
    }

    return pack;
  }

  /**
   * Generate intelligence pack for a call
   */
  @Post('calls/:callId/intelligence/generate')
  async generateIntelligencePack(@Param('callId') callId: string) {
    try {
      const pack = await this.intelligencePack.generateIntelligencePack(callId);
      return {
        success: true,
        pack,
      };
    } catch (error) {
      this.logger.error(
        `Failed to generate intelligence pack: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Compute trust score for a phone number
   */
  @Post('trust/score')
  async computeTrustScore(
    @Body()
    body: {
      phoneNumber: string;
      features?: any;
    },
  ) {
    const result = await this.trustScoring.computeTrustScore(
      body.phoneNumber,
      body.features,
    );

    return {
      phoneNumber: body.phoneNumber,
      ...result,
    };
  }

  /**
   * Mark contact as VIP
   */
  @Post('trust/vip')
  async markAsVIP(@Body() body: { phoneNumber: string }) {
    await this.trustScoring.markAsVIP(body.phoneNumber);

    return {
      success: true,
      phoneNumber: body.phoneNumber,
      message: 'Contact marked as VIP',
    };
  }

  /**
   * Block contact
   */
  @Post('trust/block')
  async blockContact(@Body() body: { phoneNumber: string }) {
    await this.trustScoring.blockContact(body.phoneNumber);

    return {
      success: true,
      phoneNumber: body.phoneNumber,
      message: 'Contact blocked',
    };
  }

  /**
   * Check policy for a tool invocation
   */
  @Post('policy/check')
  async checkPolicy(
    @Body()
    body: {
      toolName: string;
      parameters: Record<string, any>;
      callId: string;
      trustTier: number;
      userId?: string;
    },
  ) {
    const decision = await this.policyEngine.checkPolicy(
      body.toolName,
      body.parameters,
      body.callId,
      body.trustTier,
      body.userId,
    );

    return {
      ...decision,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create or update policy
   */
  @Post('policy')
  async createPolicy(
    @Body()
    body: {
      userId: string;
      name: string;
      config: any;
    },
  ) {
    await this.policyEngine.createPolicy(body.userId, body.name, body.config);

    return {
      success: true,
      message: `Policy '${body.name}' created for user ${body.userId}`,
    };
  }

  /**
   * Check if should escalate
   */
  @Post('policy/escalate')
  async checkEscalation(
    @Body()
    body: {
      trigger: string;
      context: Record<string, any>;
      userId?: string;
    },
  ) {
    const shouldEscalate = this.policyEngine.shouldEscalate(
      body.trigger,
      body.context,
      body.userId,
    );

    return {
      shouldEscalate,
      trigger: body.trigger,
    };
  }

  /**
   * Test endpoint for generating sample intelligence pack
   */
  @Get('test/intelligence-pack')
  async testIntelligencePack() {
    return {
      message: 'Sample Intelligence Pack',
      pack: {
        callId: 'test_call_123',
        durationSeconds: 187,
        summary: {
          whatHappened: 'Caller inquired about service pricing and availability.',
          whatTheyWant: 'Schedule consultation for next week.',
          whatWeDid: 'Provided pricing range, offered three time slots.',
          whatYouShouldDo: 'Confirm Tuesday 2pm if calendar allows.',
          riskFlags: ['none'],
        },
        entities: {
          callerName: 'Sarah Chen',
          company: 'TechFlow Inc',
          budgetRange: '$5k-$10k',
          timeline: 'Q1 2025',
        },
        trustScore: 0.82,
        intentDistribution: {
          sales_inquiry: 0.91,
          support: 0.05,
          spam: 0.04,
        },
        actionsTaken: [
          {
            type: 'sms_sent',
            content: 'Pricing overview',
            timestamp: new Date().toISOString(),
          },
        ],
        suggestedFollowups: [
          {
            type: 'calendar_hold',
            params: { date: '2024-12-17', time: '14:00' },
          },
          { type: 'email_draft', priority: 2 },
        ],
        auditTrail: {
          decisions: 12,
          policyChecks: 8,
          toolsInvoked: 3,
        },
      },
    };
  }
}
