import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Shadow Brain Analysis Output
 */
export interface ShadowAnalysis {
  // Intent probability distribution
  intentDistribution: Record<string, number>;

  // Extracted entities
  entities: {
    names?: string[];
    phoneNumbers?: string[];
    emails?: string[];
    amounts?: number[];
    dates?: string[];
    times?: string[];
    locations?: string[];
    [key: string]: any;
  };

  // Scam detection
  scamSignals: {
    confidence: number; // 0-1
    tactics: string[]; // e.g., "urgency_pressure", "authority_claim", "gift_card_request"
    explanation: string;
  };

  // Emotional state
  emotionalState: {
    frustration: number; // 0-1
    confusion: number;
    distress: number;
    satisfaction: number;
    urgency: number;
  };

  // Compliance triggers
  complianceTriggers: {
    piiMentioned: boolean;
    medicalTerms: boolean;
    legalThreats: boolean;
    recordingConsentNeeded: boolean;
  };

  // Next-best questions
  suggestedQuestions: Array<{
    question: string;
    priority: number;
    reasoning: string;
  }>;

  // Outcome prediction
  predictions: {
    willEscalate: number; // 0-1 probability
    isVIP: number;
    conversionProbability: number;
  };

  // Tool recommendations
  toolRecommendations: Array<{
    tool: string;
    parameters: Record<string, any>;
    confidence: number;
    reasoning: string;
  }>;
}

/**
 * Shadow Intelligence Plane
 *
 * Runs deep analysis parallel to voice output so the audible agent
 * stays fast while decisions get smarter.
 *
 * Operates on a separate inference thread, receiving transcript updates
 * every 500ms. Never blocks the voice loop.
 *
 * Results are pushed to the Orchestrator as 'advice' that can influence
 * but not override the primary response path.
 */
@Injectable()
export class ShadowBrainService {
  private readonly logger = new Logger(ShadowBrainService.name);
  private analysisWorkers: Map<string, NodeJS.Timeout> = new Map();

  constructor(private configService: ConfigService) {}

  /**
   * Start continuous analysis for a call
   * Updates every 500ms with latest transcript
   */
  startContinuousAnalysis(
    callId: string,
    transcriptGetter: () => string,
    onUpdate: (analysis: ShadowAnalysis) => void,
  ): void {
    this.logger.log(`Starting continuous analysis for call: ${callId}`);

    // Run analysis every 500ms
    const worker = setInterval(async () => {
      const transcript = transcriptGetter();
      if (!transcript) return;

      try {
        const analysis = await this.analyzeTranscript(transcript);
        onUpdate(analysis);
      } catch (error) {
        this.logger.error(`Shadow Brain analysis error: ${error.message}`);
      }
    }, 500);

    this.analysisWorkers.set(callId, worker);
  }

  /**
   * Stop continuous analysis for a call
   */
  stopContinuousAnalysis(callId: string): void {
    const worker = this.analysisWorkers.get(callId);
    if (worker) {
      clearInterval(worker);
      this.analysisWorkers.delete(callId);
      this.logger.log(`Stopped continuous analysis for call: ${callId}`);
    }
  }

  /**
   * Analyze transcript and return comprehensive intelligence
   *
   * Uses ensemble of models:
   * - Intent Classification: Fine-tuned DistilBERT
   * - Entity Extraction: spaCy + Custom NER
   * - Scam Detection: Ensemble (rules + ML)
   * - Sentiment/Emotion: RoBERTa-emotion
   * - Strategy Suggestion: GPT-4 Turbo (cached)
   */
  async analyzeTranscript(transcript: string): Promise<ShadowAnalysis> {
    const startTime = Date.now();

    // Run all analyses in parallel
    const [
      intentDist,
      entities,
      scamSignals,
      emotionalState,
      complianceTriggers,
      suggestedQuestions,
      predictions,
      toolRecommendations,
    ] = await Promise.all([
      this.classifyIntent(transcript),
      this.extractEntities(transcript),
      this.detectScamTactics(transcript),
      this.analyzeEmotionalState(transcript),
      this.detectComplianceTriggers(transcript),
      this.suggestNextQuestions(transcript),
      this.predictOutcomes(transcript),
      this.recommendTools(transcript),
    ]);

    const analysisTime = Date.now() - startTime;
    this.logger.debug(`Shadow Brain analysis completed in ${analysisTime}ms`);

    return {
      intentDistribution: intentDist,
      entities,
      scamSignals,
      emotionalState,
      complianceTriggers,
      suggestedQuestions,
      predictions,
      toolRecommendations,
    };
  }

  /**
   * Classify caller intent with probability distribution
   * Model: Fine-tuned DistilBERT
   */
  private async classifyIntent(
    transcript: string,
  ): Promise<Record<string, number>> {
    // TODO: Implement with actual ML model
    // For now, return rule-based classification

    const intents: Record<string, number> = {
      sales: 0,
      support: 0,
      spam: 0,
      appointment: 0,
      information: 0,
      complaint: 0,
    };

    const lowerTranscript = transcript.toLowerCase();

    // Simple keyword-based classification (placeholder)
    if (lowerTranscript.includes('buy') || lowerTranscript.includes('purchase')) {
      intents.sales = 0.7;
      intents.information = 0.2;
    } else if (lowerTranscript.includes('help') || lowerTranscript.includes('issue')) {
      intents.support = 0.8;
      intents.complaint = 0.1;
    } else if (
      lowerTranscript.includes('schedule') ||
      lowerTranscript.includes('appointment')
    ) {
      intents.appointment = 0.9;
    } else if (
      lowerTranscript.includes('urgent') ||
      lowerTranscript.includes('immediately')
    ) {
      intents.spam = 0.3;
      intents.support = 0.4;
    } else {
      intents.information = 0.6;
    }

    return intents;
  }

  /**
   * Extract entities using NER
   * Model: spaCy + Custom NER
   */
  private async extractEntities(transcript: string): Promise<any> {
    // TODO: Implement with spaCy or similar NER library
    // For now, return simple regex-based extraction

    const entities: any = {};

    // Extract phone numbers
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    entities.phoneNumbers = transcript.match(phoneRegex) || [];

    // Extract emails
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    entities.emails = transcript.match(emailRegex) || [];

    // Extract amounts (simple)
    const amountRegex = /\$\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/g;
    const amounts = [];
    let match;
    while ((match = amountRegex.exec(transcript)) !== null) {
      amounts.push(parseFloat(match[1].replace(/,/g, '')));
    }
    entities.amounts = amounts;

    return entities;
  }

  /**
   * Detect scam tactics and red flags
   * Model: Ensemble (rules + ML)
   */
  private async detectScamTactics(transcript: string): Promise<any> {
    const lowerTranscript = transcript.toLowerCase();
    const tactics: string[] = [];
    let confidence = 0;

    // Bank/government impersonation
    if (
      lowerTranscript.includes('irs') ||
      lowerTranscript.includes('social security') ||
      lowerTranscript.includes('bank account suspended')
    ) {
      tactics.push('authority_impersonation');
      confidence += 0.4;
    }

    // Urgency pressure
    if (
      lowerTranscript.includes('immediately') ||
      lowerTranscript.includes('right now') ||
      lowerTranscript.includes('urgent') ||
      lowerTranscript.includes('expires today')
    ) {
      tactics.push('urgency_pressure');
      confidence += 0.2;
    }

    // Gift card requests (major red flag)
    if (
      lowerTranscript.includes('gift card') ||
      lowerTranscript.includes('itunes card') ||
      lowerTranscript.includes('google play card')
    ) {
      tactics.push('gift_card_request');
      confidence += 0.5;
    }

    // Threatening language
    if (
      lowerTranscript.includes('arrest') ||
      lowerTranscript.includes('lawsuit') ||
      lowerTranscript.includes('legal action')
    ) {
      tactics.push('threats');
      confidence += 0.3;
    }

    // Request for sensitive info
    if (
      lowerTranscript.includes('social security number') ||
      lowerTranscript.includes('credit card') ||
      lowerTranscript.includes('password')
    ) {
      tactics.push('sensitive_info_request');
      confidence += 0.4;
    }

    confidence = Math.min(confidence, 1.0);

    return {
      confidence,
      tactics,
      explanation:
        tactics.length > 0
          ? `Detected scam tactics: ${tactics.join(', ')}`
          : 'No scam indicators detected',
    };
  }

  /**
   * Analyze emotional state of caller
   * Model: RoBERTa-emotion
   */
  private async analyzeEmotionalState(transcript: string): Promise<any> {
    // TODO: Implement with RoBERTa or similar emotion detection model
    // For now, return simple keyword-based analysis

    const lowerTranscript = transcript.toLowerCase();

    return {
      frustration: this.scoreEmotion(lowerTranscript, [
        'frustrated',
        'annoyed',
        'upset',
      ]),
      confusion: this.scoreEmotion(lowerTranscript, [
        'confused',
        'unclear',
        "don't understand",
      ]),
      distress: this.scoreEmotion(lowerTranscript, [
        'help',
        'urgent',
        'emergency',
      ]),
      satisfaction: this.scoreEmotion(lowerTranscript, [
        'thank',
        'great',
        'perfect',
      ]),
      urgency: this.scoreEmotion(lowerTranscript, [
        'urgent',
        'immediately',
        'asap',
      ]),
    };
  }

  private scoreEmotion(text: string, keywords: string[]): number {
    let score = 0;
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        score += 0.3;
      }
    }
    return Math.min(score, 1.0);
  }

  /**
   * Detect compliance triggers
   */
  private async detectComplianceTriggers(transcript: string): Promise<any> {
    const lowerTranscript = transcript.toLowerCase();

    return {
      piiMentioned:
        lowerTranscript.includes('social security') ||
        lowerTranscript.includes('date of birth') ||
        lowerTranscript.includes('credit card'),
      medicalTerms:
        lowerTranscript.includes('medical') ||
        lowerTranscript.includes('health') ||
        lowerTranscript.includes('prescription'),
      legalThreats:
        lowerTranscript.includes('lawsuit') ||
        lowerTranscript.includes('legal action') ||
        lowerTranscript.includes('attorney'),
      recordingConsentNeeded: !lowerTranscript.includes('consent to record'),
    };
  }

  /**
   * Suggest next-best questions based on information gaps
   */
  private async suggestNextQuestions(transcript: string): Promise<any[]> {
    // TODO: Implement with GPT-4 Turbo
    // For now, return basic suggestions

    const suggestions = [
      {
        question: 'May I have your name and phone number?',
        priority: 1.0,
        reasoning: 'Basic contact information not captured',
      },
      {
        question: 'What is the best way to reach you?',
        priority: 0.8,
        reasoning: 'Preferred contact method unclear',
      },
    ];

    return suggestions;
  }

  /**
   * Predict call outcomes
   */
  private async predictOutcomes(transcript: string): Promise<any> {
    // TODO: Implement with ML model trained on historical data
    const lowerTranscript = transcript.toLowerCase();

    return {
      willEscalate: lowerTranscript.includes('manager') ||
        lowerTranscript.includes('supervisor')
        ? 0.8
        : 0.2,
      isVIP: 0.3, // Placeholder
      conversionProbability: 0.5, // Placeholder
    };
  }

  /**
   * Recommend tools with bounded parameters
   */
  private async recommendTools(transcript: string): Promise<any[]> {
    const lowerTranscript = transcript.toLowerCase();
    const recommendations = [];

    if (
      lowerTranscript.includes('schedule') ||
      lowerTranscript.includes('appointment')
    ) {
      recommendations.push({
        tool: 'schedule_appointment',
        parameters: {
          // These would be extracted from transcript
        },
        confidence: 0.8,
        reasoning: 'Caller expressed interest in scheduling',
      });
    }

    if (lowerTranscript.includes('information') || lowerTranscript.includes('details')) {
      recommendations.push({
        tool: 'send_sms',
        parameters: {
          content: 'Follow-up information as requested',
        },
        confidence: 0.7,
        reasoning: 'Caller requested information',
      });
    }

    return recommendations;
  }
}
