import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Tool Execution Modes
 */
export enum ExecutionMode {
  AUTO = 'auto', // Execute automatically
  CONFIRM_FIRST = 'confirm_first', // Ask user first
  REQUIRE_APPROVAL = 'require_approval', // Require explicit approval
  DENY = 'deny', // Blocked
}

/**
 * Policy Decision Result
 */
export interface PolicyDecision {
  decision: 'allow' | 'deny' | 'confirm_first';
  reasoning: string;
  policyRule: string;
  trustTierRequired: number;
  callerTrustTier: number;
  executionMode: ExecutionMode;
  rateLimit?: {
    allowed: boolean;
    remaining: number;
    resetAt: Date;
  };
}

/**
 * Tool Permission Configuration
 */
export interface ToolPermission {
  mode: ExecutionMode;
  trustTierRequired?: number; // Minimum trust tier (0-4)
  rateLimit?: string; // e.g., "5/hour", "10/day"
  allowedWindows?: string[]; // e.g., ["9am-5pm weekdays"]
  maxDuration?: string; // For appointments, e.g., "60min"
  discountCeiling?: number; // For price negotiation
  requiresManager?: boolean;
}

/**
 * Policy Configuration Schema
 */
export interface PolicyConfig {
  toolPermissions: Record<string, ToolPermission>;
  escalationTriggers: string[];
  disclosureRules: Record<string, string>; // What to share at each trust tier
}

/**
 * Default Policy Configuration
 * Implements CallOS Action Classification from spec
 */
const DEFAULT_POLICY: PolicyConfig = {
  toolPermissions: {
    // Soft Actions - Auto-execute
    send_sms: {
      mode: ExecutionMode.AUTO,
      rateLimit: '5/hour',
      trustTierRequired: 0,
    },
    create_ticket: {
      mode: ExecutionMode.AUTO,
      trustTierRequired: 0,
    },
    update_notes: {
      mode: ExecutionMode.AUTO,
      trustTierRequired: 0,
    },

    // Medium Actions - Confirm first or auto based on trust tier
    schedule_appointment: {
      mode: ExecutionMode.CONFIRM_FIRST,
      trustTierRequired: 2,
      allowedWindows: ['9am-5pm weekdays'],
      maxDuration: '60min',
    },
    send_document: {
      mode: ExecutionMode.CONFIRM_FIRST,
      trustTierRequired: 2,
    },
    update_crm: {
      mode: ExecutionMode.AUTO,
      trustTierRequired: 1,
    },

    // Hard Actions - Always confirm, audit trail required
    book_appointment: {
      mode: ExecutionMode.REQUIRE_APPROVAL,
      trustTierRequired: 3,
    },
    negotiate_price: {
      mode: ExecutionMode.REQUIRE_APPROVAL,
      trustTierRequired: 3,
      discountCeiling: 0.10,
      requiresManager: true,
    },
    initiate_payment: {
      mode: ExecutionMode.REQUIRE_APPROVAL,
      trustTierRequired: 4,
    },
  },
  escalationTriggers: [
    'legal_threat',
    'distress_detected',
    'payment_dispute',
    'harassment',
    'high_value_negotiation',
  ],
  disclosureRules: {
    address: 'tier_3_plus',
    pricing: 'tier_2_plus',
    personal_info: 'tier_4_only',
  },
};

/**
 * Policy Engine Service
 *
 * Implements CallOS Action Execution Plane with safe autonomous operation.
 *
 * Every action execution includes:
 * - Tool Contract: Expected inputs, outputs, side effects
 * - Policy Decision: Which rule authorized this, at what trust tier
 * - Explanation: Human-readable reason
 * - Receipt: Confirmation sent to both caller and owner
 * - Rollback Plan: How to undo if disputed
 * - Human Override: Owner can intervene at any point
 */
@Injectable()
export class PolicyEngineService {
  private readonly logger = new Logger(PolicyEngineService.name);
  private rateLimitTracking: Map<string, Map<string, number[]>> = new Map(); // callId -> tool -> timestamps

  constructor(private prisma: PrismaService) {}

  /**
   * Check if a tool invocation is allowed based on policy and trust tier
   */
  async checkPolicy(
    toolName: string,
    parameters: Record<string, any>,
    callId: string,
    trustTier: number,
    userId?: string,
  ): Promise<PolicyDecision> {
    // Get policy configuration (user-specific or default)
    const policyConfig = await this.getPolicyConfig(userId);

    const toolPermission = policyConfig.toolPermissions[toolName];

    // Tool not in policy = deny by default (secure by default)
    if (!toolPermission) {
      return {
        decision: 'deny',
        reasoning: `Tool '${toolName}' is not defined in policy`,
        policyRule: 'default_deny',
        trustTierRequired: 5, // Impossible tier
        callerTrustTier: trustTier,
        executionMode: ExecutionMode.DENY,
      };
    }

    // Check trust tier requirement
    const requiredTier = toolPermission.trustTierRequired ?? 0;
    if (trustTier < requiredTier) {
      return {
        decision: 'deny',
        reasoning: `Caller trust tier ${trustTier} is below required tier ${requiredTier}`,
        policyRule: `${toolName}_trust_tier`,
        trustTierRequired: requiredTier,
        callerTrustTier: trustTier,
        executionMode: ExecutionMode.DENY,
      };
    }

    // Check rate limits
    const rateLimitResult = await this.checkRateLimit(
      callId,
      toolName,
      toolPermission.rateLimit,
    );

    if (!rateLimitResult.allowed) {
      return {
        decision: 'deny',
        reasoning: `Rate limit exceeded for tool '${toolName}'`,
        policyRule: `${toolName}_rate_limit`,
        trustTierRequired: requiredTier,
        callerTrustTier: trustTier,
        executionMode: ExecutionMode.DENY,
        rateLimit: rateLimitResult,
      };
    }

    // Check time windows (for scheduling tools)
    if (toolPermission.allowedWindows) {
      const isWithinWindow = this.checkTimeWindow(
        toolPermission.allowedWindows,
      );
      if (!isWithinWindow) {
        return {
          decision: 'deny',
          reasoning: `Request is outside allowed time windows`,
          policyRule: `${toolName}_time_window`,
          trustTierRequired: requiredTier,
          callerTrustTier: trustTier,
          executionMode: ExecutionMode.DENY,
        };
      }
    }

    // Check specific constraints (e.g., discount ceiling)
    if (toolName === 'negotiate_price' && parameters.discount) {
      const maxDiscount = toolPermission.discountCeiling ?? 0;
      if (parameters.discount > maxDiscount) {
        return {
          decision: 'deny',
          reasoning: `Requested discount ${parameters.discount} exceeds ceiling ${maxDiscount}`,
          policyRule: `${toolName}_discount_ceiling`,
          trustTierRequired: requiredTier,
          callerTrustTier: trustTier,
          executionMode: ExecutionMode.REQUIRE_APPROVAL,
        };
      }
    }

    // Determine decision based on execution mode
    let decision: 'allow' | 'deny' | 'confirm_first';

    switch (toolPermission.mode) {
      case ExecutionMode.AUTO:
        decision = 'allow';
        break;
      case ExecutionMode.CONFIRM_FIRST:
        decision = 'confirm_first';
        break;
      case ExecutionMode.REQUIRE_APPROVAL:
        decision = 'confirm_first'; // User must explicitly approve
        break;
      case ExecutionMode.DENY:
        decision = 'deny';
        break;
      default:
        decision = 'deny';
    }

    return {
      decision,
      reasoning: this.generateReasoning(
        toolName,
        toolPermission,
        trustTier,
        decision,
      ),
      policyRule: `${toolName}_${toolPermission.mode}`,
      trustTierRequired: requiredTier,
      callerTrustTier: trustTier,
      executionMode: toolPermission.mode,
      rateLimit: rateLimitResult,
    };
  }

  /**
   * Check if action should trigger escalation
   */
  shouldEscalate(
    trigger: string,
    context: Record<string, any>,
    userId?: string,
  ): boolean {
    // TODO: Get user-specific escalation triggers
    const triggers = DEFAULT_POLICY.escalationTriggers;

    return triggers.includes(trigger);
  }

  /**
   * Check disclosure rules - what information can be shared at a given trust tier
   */
  canDisclose(field: string, trustTier: number, userId?: string): boolean {
    const rules = DEFAULT_POLICY.disclosureRules;
    const rule = rules[field];

    if (!rule) return false; // Deny by default

    switch (rule) {
      case 'tier_0_plus':
        return trustTier >= 0;
      case 'tier_1_plus':
        return trustTier >= 1;
      case 'tier_2_plus':
        return trustTier >= 2;
      case 'tier_3_plus':
        return trustTier >= 3;
      case 'tier_4_only':
        return trustTier >= 4;
      default:
        return false;
    }
  }

  /**
   * Get policy configuration for a user
   */
  private async getPolicyConfig(userId?: string): Promise<PolicyConfig> {
    if (!userId) {
      return DEFAULT_POLICY;
    }

    try {
      const policy = await this.prisma.policy.findFirst({
        where: {
          userId,
          isActive: true,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });

      if (policy) {
        return {
          toolPermissions: JSON.parse(policy.toolPermissions),
          escalationTriggers: policy.escalationTriggers
            ? JSON.parse(policy.escalationTriggers)
            : [],
          disclosureRules: policy.disclosureRules
            ? JSON.parse(policy.disclosureRules)
            : {},
        };
      }
    } catch (error) {
      this.logger.warn(
        `Failed to load user policy, using default: ${error.message}`,
      );
    }

    return DEFAULT_POLICY;
  }

  /**
   * Check rate limits for a tool
   */
  private async checkRateLimit(
    callId: string,
    toolName: string,
    rateLimit?: string,
  ): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    if (!rateLimit) {
      return {
        allowed: true,
        remaining: Infinity,
        resetAt: new Date(Date.now() + 3600000),
      };
    }

    const [limitStr, periodStr] = rateLimit.split('/');
    const limit = parseInt(limitStr);
    const periodMs = this.parsePeriod(periodStr);

    // Get or create tracking for this call/tool
    if (!this.rateLimitTracking.has(callId)) {
      this.rateLimitTracking.set(callId, new Map());
    }

    const callTracking = this.rateLimitTracking.get(callId);
    const timestamps = callTracking.get(toolName) || [];

    // Remove expired timestamps
    const now = Date.now();
    const validTimestamps = timestamps.filter((ts) => now - ts < periodMs);

    // Check if limit exceeded
    if (validTimestamps.length >= limit) {
      const oldestTimestamp = Math.min(...validTimestamps);
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(oldestTimestamp + periodMs),
      };
    }

    // Record this invocation
    validTimestamps.push(now);
    callTracking.set(toolName, validTimestamps);

    return {
      allowed: true,
      remaining: limit - validTimestamps.length,
      resetAt: new Date(now + periodMs),
    };
  }

  /**
   * Parse period string to milliseconds
   */
  private parsePeriod(period: string): number {
    if (period.endsWith('hour')) {
      return 3600000;
    } else if (period.endsWith('day')) {
      return 86400000;
    } else if (period.endsWith('minute')) {
      return 60000;
    }
    return 3600000; // Default to 1 hour
  }

  /**
   * Check if current time is within allowed windows
   */
  private checkTimeWindow(windows: string[]): boolean {
    // TODO: Implement proper time window checking
    // For now, always return true
    return true;
  }

  /**
   * Generate human-readable reasoning for policy decision
   */
  private generateReasoning(
    toolName: string,
    permission: ToolPermission,
    trustTier: number,
    decision: string,
  ): string {
    if (decision === 'allow') {
      return `Tool '${toolName}' is allowed to execute automatically (trust tier ${trustTier})`;
    } else if (decision === 'confirm_first') {
      return `Tool '${toolName}' requires user confirmation before execution`;
    } else {
      return `Tool '${toolName}' is not allowed`;
    }
  }

  /**
   * Create or update user policy
   */
  async createPolicy(
    userId: string,
    name: string,
    config: PolicyConfig,
  ): Promise<void> {
    await this.prisma.policy.create({
      data: {
        userId,
        name,
        toolPermissions: JSON.stringify(config.toolPermissions),
        escalationTriggers: JSON.stringify(config.escalationTriggers),
        disclosureRules: JSON.stringify(config.disclosureRules),
      },
    });

    this.logger.log(`Created policy '${name}' for user ${userId}`);
  }
}
