import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Trust Tier Levels (from CallOS spec)
 */
export enum TrustTier {
  TIER_0 = 0, // Unknown caller, no history - Qualification only, no PII exchange
  TIER_1 = 1, // Known number, some history - View public info, propose times
  TIER_2 = 2, // Verified via challenge/OTP - Schedule holds, send documents
  TIER_3 = 3, // VIP/trusted contact - Full disclosure, limited negotiation
  TIER_4 = 4, // Internal staff/admin - All tools, override capabilities
}

/**
 * Verification Methods
 */
export enum VerificationMethod {
  CALLBACK = 'callback', // Text a code to number on file
  OTP = 'otp', // One-time password
  REFERENCE_PHRASE = 'reference_phrase', // Shared secret
  KNOWN_DETAILS = 'known_details', // Non-sensitive confirmation
  VOICEPRINT = 'voiceprint', // Biometric (opt-in only)
}

/**
 * Trust Score Computation Features
 */
export interface TrustFeatures {
  stirShakenAttestation?: 'A' | 'B' | 'C' | null;
  historicalCallCount: number;
  scamPatternScore: number; // 0-1, higher = more likely spam
  verificationMethod?: VerificationMethod;
  timeOfDayAnomaly: number; // 0-1, higher = more unusual
  geographicConsistency: number; // 0-1, higher = more consistent
}

/**
 * Trust Score Result
 */
export interface TrustScoreResult {
  score: number; // 0-1 computed trust score
  tier: TrustTier; // Assigned trust tier
  features: TrustFeatures;
  reasoning: string;
  recommendedActions: string[];
}

/**
 * Trust & Authenticity Plane Service
 *
 * Implements multi-dimensional trust scoring according to CallOS spec.
 *
 * Trust Score Computation:
 * Trust Score = Σ(feature_weight × feature_value)
 *
 * Features:
 * - STIR/SHAKEN attestation level (+0.2 for A, +0.1 for B, 0 for C)
 * - Historical call count (+0.05 per verified call, max +0.5)
 * - Scam pattern match score (-0.3 to -0.9 based on severity)
 * - Verification completion (+0.3 for OTP, +0.2 for callback)
 * - Time-of-day anomaly (-0.1 for unusual hours)
 * - Geographic consistency (+0.1 if location matches history)
 */
@Injectable()
export class TrustScoringService {
  private readonly logger = new Logger(TrustScoringService.name);

  // Feature weights from CallOS spec
  private readonly WEIGHTS = {
    STIR_SHAKEN_A: 0.2,
    STIR_SHAKEN_B: 0.1,
    STIR_SHAKEN_C: 0.0,
    HISTORICAL_CALL: 0.05,
    HISTORICAL_CALL_MAX: 0.5,
    SCAM_PATTERN_MIN: -0.9,
    SCAM_PATTERN_MAX: -0.3,
    VERIFICATION_OTP: 0.3,
    VERIFICATION_CALLBACK: 0.2,
    VERIFICATION_DETAILS: 0.15,
    TIME_ANOMALY: -0.1,
    GEO_CONSISTENCY: 0.1,
  };

  constructor(private prisma: PrismaService) {}

  /**
   * Compute trust score for a caller
   * Returns score (0-1) and assigned trust tier (0-4)
   */
  async computeTrustScore(
    phoneNumber: string,
    features: Partial<TrustFeatures> = {},
  ): Promise<TrustScoreResult> {
    const startTime = Date.now();

    // Get or create contact
    let contact = await this.prisma.contact.findUnique({
      where: { phoneNumber },
      include: {
        calls: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        trustScores: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!contact) {
      // New caller - create contact
      contact = await this.prisma.contact.create({
        data: {
          phoneNumber,
          trustTier: TrustTier.TIER_0,
          trustScore: 0.0,
        },
        include: {
          calls: true,
          trustScores: true,
        },
      });
    }

    // Build complete features from database + provided
    const completeFeatures: TrustFeatures = {
      stirShakenAttestation: features.stirShakenAttestation || null,
      historicalCallCount: contact.calls.length,
      scamPatternScore: features.scamPatternScore || 0.0,
      verificationMethod: features.verificationMethod,
      timeOfDayAnomaly: features.timeOfDayAnomaly || 0.0,
      geographicConsistency: features.geographicConsistency || 0.5,
    };

    // Compute weighted trust score
    let score = 0.0;

    // STIR/SHAKEN attestation
    if (completeFeatures.stirShakenAttestation === 'A') {
      score += this.WEIGHTS.STIR_SHAKEN_A;
    } else if (completeFeatures.stirShakenAttestation === 'B') {
      score += this.WEIGHTS.STIR_SHAKEN_B;
    }

    // Historical calls (verified)
    const verifiedCallBonus = Math.min(
      completeFeatures.historicalCallCount * this.WEIGHTS.HISTORICAL_CALL,
      this.WEIGHTS.HISTORICAL_CALL_MAX,
    );
    score += verifiedCallBonus;

    // Scam pattern penalty
    if (completeFeatures.scamPatternScore > 0) {
      const scamPenalty =
        this.WEIGHTS.SCAM_PATTERN_MIN +
        completeFeatures.scamPatternScore *
          (this.WEIGHTS.SCAM_PATTERN_MAX - this.WEIGHTS.SCAM_PATTERN_MIN);
      score += scamPenalty;
    }

    // Verification method boost
    if (completeFeatures.verificationMethod === VerificationMethod.OTP) {
      score += this.WEIGHTS.VERIFICATION_OTP;
    } else if (
      completeFeatures.verificationMethod === VerificationMethod.CALLBACK
    ) {
      score += this.WEIGHTS.VERIFICATION_CALLBACK;
    } else if (
      completeFeatures.verificationMethod === VerificationMethod.KNOWN_DETAILS
    ) {
      score += this.WEIGHTS.VERIFICATION_DETAILS;
    }

    // Time-of-day anomaly penalty
    if (completeFeatures.timeOfDayAnomaly > 0.5) {
      score += this.WEIGHTS.TIME_ANOMALY;
    }

    // Geographic consistency bonus
    score += completeFeatures.geographicConsistency * this.WEIGHTS.GEO_CONSISTENCY;

    // Clamp score to [0, 1]
    score = Math.max(0, Math.min(1, score));

    // Determine trust tier
    const tier = this.scoreToTier(score, contact.isVIP, contact.isBlocked);

    // Build reasoning
    const reasoning = this.buildReasoning(
      score,
      tier,
      completeFeatures,
      contact.isVIP,
      contact.isBlocked,
    );

    // Recommended actions
    const recommendedActions = this.getRecommendedActions(
      tier,
      completeFeatures,
    );

    // Update contact trust score and tier
    await this.prisma.contact.update({
      where: { id: contact.id },
      data: {
        trustScore: score,
        trustTier: tier,
      },
    });

    // Log trust score to database
    await this.prisma.trustScore.create({
      data: {
        contactId: contact.id,
        score,
        tier,
        stirShakenAttestation: completeFeatures.stirShakenAttestation,
        historicalCallCount: completeFeatures.historicalCallCount,
        scamPatternScore: completeFeatures.scamPatternScore,
        verificationMethod: completeFeatures.verificationMethod,
        timeOfDayAnomaly: completeFeatures.timeOfDayAnomaly,
        geographicConsistency: completeFeatures.geographicConsistency,
        reason: reasoning,
      },
    });

    const computeTime = Date.now() - startTime;
    this.logger.debug(
      `Trust score computed: ${score.toFixed(3)} (tier ${tier}) in ${computeTime}ms`,
    );

    return {
      score,
      tier,
      features: completeFeatures,
      reasoning,
      recommendedActions,
    };
  }

  /**
   * Map trust score to trust tier
   */
  private scoreToTier(
    score: number,
    isVIP: boolean,
    isBlocked: boolean,
  ): TrustTier {
    if (isBlocked) {
      return TrustTier.TIER_0; // Blocked callers always tier 0
    }

    if (isVIP) {
      return TrustTier.TIER_3; // VIPs get tier 3 minimum
    }

    // Standard tier mapping
    if (score >= 0.8) {
      return TrustTier.TIER_3;
    } else if (score >= 0.6) {
      return TrustTier.TIER_2;
    } else if (score >= 0.3) {
      return TrustTier.TIER_1;
    } else {
      return TrustTier.TIER_0;
    }
  }

  /**
   * Build human-readable reasoning for trust score
   */
  private buildReasoning(
    score: number,
    tier: TrustTier,
    features: TrustFeatures,
    isVIP: boolean,
    isBlocked: boolean,
  ): string {
    const reasons: string[] = [];

    if (isBlocked) {
      return 'Caller is blocked';
    }

    if (isVIP) {
      reasons.push('Marked as VIP');
    }

    if (features.stirShakenAttestation === 'A') {
      reasons.push('STIR/SHAKEN fully authenticated');
    }

    if (features.historicalCallCount > 5) {
      reasons.push(`${features.historicalCallCount} previous verified calls`);
    }

    if (features.scamPatternScore > 0.7) {
      reasons.push('High scam pattern match');
    }

    if (features.verificationMethod) {
      reasons.push(`Verified via ${features.verificationMethod}`);
    }

    if (features.timeOfDayAnomaly > 0.7) {
      reasons.push('Unusual call time');
    }

    if (features.geographicConsistency < 0.3) {
      reasons.push('Location inconsistent with history');
    }

    return reasons.length > 0 ? reasons.join('; ') : 'New caller, no history';
  }

  /**
   * Get recommended verification actions based on tier
   */
  private getRecommendedActions(
    tier: TrustTier,
    features: TrustFeatures,
  ): string[] {
    const actions: string[] = [];

    if (tier === TrustTier.TIER_0) {
      actions.push('Collect basic contact information');
      actions.push('Qualify intent before sharing details');

      if (features.scamPatternScore > 0.7) {
        actions.push('Consider immediate verification challenge');
        actions.push('Activate scam protection scripts');
      }
    }

    if (tier === TrustTier.TIER_1 && !features.verificationMethod) {
      actions.push('Suggest callback verification to increase trust');
    }

    if (tier >= TrustTier.TIER_2) {
      actions.push('Can share non-sensitive information');
      actions.push('Able to schedule tentative appointments');
    }

    if (tier >= TrustTier.TIER_3) {
      actions.push('Full access to information');
      actions.push('Can negotiate and commit to actions');
    }

    return actions;
  }

  /**
   * Verify caller via OTP
   */
  async verifyViaOTP(
    phoneNumber: string,
    otp: string,
  ): Promise<{ success: boolean; newTrustScore?: TrustScoreResult }> {
    // TODO: Implement actual OTP verification
    // For now, assume verification succeeds

    this.logger.log(`OTP verification for ${phoneNumber}`);

    const result = await this.computeTrustScore(phoneNumber, {
      verificationMethod: VerificationMethod.OTP,
    });

    return {
      success: true,
      newTrustScore: result,
    };
  }

  /**
   * Verify caller via callback
   */
  async verifyViaCallback(phoneNumber: string): Promise<boolean> {
    // TODO: Implement actual callback verification
    this.logger.log(`Callback verification initiated for ${phoneNumber}`);

    await this.computeTrustScore(phoneNumber, {
      verificationMethod: VerificationMethod.CALLBACK,
    });

    return true;
  }

  /**
   * Mark contact as VIP
   */
  async markAsVIP(phoneNumber: string): Promise<void> {
    await this.prisma.contact.update({
      where: { phoneNumber },
      data: {
        isVIP: true,
        trustTier: TrustTier.TIER_3,
      },
    });

    this.logger.log(`Contact ${phoneNumber} marked as VIP`);
  }

  /**
   * Block contact
   */
  async blockContact(phoneNumber: string): Promise<void> {
    await this.prisma.contact.update({
      where: { phoneNumber },
      data: {
        isBlocked: true,
        trustTier: TrustTier.TIER_0,
      },
    });

    this.logger.log(`Contact ${phoneNumber} blocked`);
  }

  /**
   * Get auto-activation scripts for high-confidence scam calls
   */
  getScamProtectionScript(scamConfidence: number): string[] {
    if (scamConfidence < 0.7) {
      return [];
    }

    return [
      "I'm going to verify this request through our official channels.",
      'Can you provide the reference number from your official correspondence?',
      "I'll need to call you back at the number listed on our records.",
    ];
  }
}
