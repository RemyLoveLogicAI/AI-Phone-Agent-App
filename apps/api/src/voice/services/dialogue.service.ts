import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Config } from '../../config/config.schema';
import OpenAI from 'openai';

export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export interface DialogueState {
  sessionId: string;
  conversationHistory: ConversationMessage[];
  context: Record<string, any>;
  lastInteractionTime: Date;
}

/**
 * Dialogue Service
 * Manages conversation state and AI response generation
 * Phase 1: Simple OpenAI-based responses
 * Phase 3+: Will integrate LangGraph for complex state machines
 */
@Injectable()
export class DialogueService {
  private readonly logger = new Logger(DialogueService.name);
  private readonly openai: OpenAI;
  private readonly model: string;
  private readonly sessions = new Map<string, DialogueState>();
  private readonly systemPrompt: string;

  constructor(private readonly configService: ConfigService<Config>) {
    const apiKey = this.configService.get('OPENAI_API_KEY', { infer: true });
    this.model = this.configService.get('OPENAI_MODEL', { infer: true });

    this.openai = new OpenAI({ apiKey });

    // Default system prompt for voice agent
    this.systemPrompt = `You are a helpful AI phone assistant. You help users with their requests in a friendly, concise manner.

Key instructions:
- Keep responses brief and conversational (1-2 sentences ideal for voice)
- Be natural and human-like in speech
- Don't use markdown, emojis, or special formatting
- Ask clarifying questions when needed
- Be professional but warm
- If you don't know something, say so clearly

Current time: ${new Date().toLocaleString()}`;

    this.logger.log('Dialogue service initialized');
  }

  /**
   * Initialize a new conversation session
   */
  initializeSession(
    sessionId: string,
    customSystemPrompt?: string,
    initialContext?: Record<string, any>,
  ): DialogueState {
    const state: DialogueState = {
      sessionId,
      conversationHistory: [
        {
          role: 'system',
          content: customSystemPrompt || this.systemPrompt,
          timestamp: new Date(),
        },
      ],
      context: initialContext || {},
      lastInteractionTime: new Date(),
    };

    this.sessions.set(sessionId, state);
    this.logger.log(`Initialized dialogue session: ${sessionId}`);
    return state;
  }

  /**
   * Get session state
   */
  getSession(sessionId: string): DialogueState | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Add user message to conversation
   */
  addUserMessage(sessionId: string, message: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.conversationHistory.push({
      role: 'user',
      content: message,
      timestamp: new Date(),
    });

    session.lastInteractionTime = new Date();
  }

  /**
   * Generate AI response based on conversation history
   */
  async generateResponse(
    sessionId: string,
    userMessage?: string,
  ): Promise<string> {
    let session = this.sessions.get(sessionId);

    // Initialize session if it doesn't exist
    if (!session) {
      session = this.initializeSession(sessionId);
    }

    // Add user message if provided
    if (userMessage) {
      this.addUserMessage(sessionId, userMessage);
    }

    this.logger.debug(`Generating response for session: ${sessionId}`);

    try {
      // Call OpenAI
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: session.conversationHistory.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: 0.7,
        max_tokens: 150, // Keep responses concise for voice
      });

      const response = completion.choices[0]?.message?.content || '';

      if (!response) {
        throw new Error('Empty response from OpenAI');
      }

      // Add assistant response to history
      session.conversationHistory.push({
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      });

      session.lastInteractionTime = new Date();

      this.logger.debug(`Generated response: "${response.substring(0, 50)}..."`);
      return response;
    } catch (error) {
      this.logger.error(
        `Failed to generate response: ${error.message}`,
        error.stack,
      );

      // Return fallback response
      const fallbackResponse =
        "I'm sorry, I'm having trouble processing that right now. Could you try again?";

      session.conversationHistory.push({
        role: 'assistant',
        content: fallbackResponse,
        timestamp: new Date(),
      });

      return fallbackResponse;
    }
  }

  /**
   * Generate initial greeting
   */
  async generateGreeting(sessionId: string): Promise<string> {
    const session = this.initializeSession(sessionId);

    const greetingPrompt = 'Generate a brief, friendly greeting for a phone call.';

    session.conversationHistory.push({
      role: 'user',
      content: greetingPrompt,
      timestamp: new Date(),
    });

    return this.generateResponse(sessionId);
  }

  /**
   * Update session context
   */
  updateContext(
    sessionId: string,
    updates: Record<string, any>,
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.context = {
      ...session.context,
      ...updates,
    };
  }

  /**
   * Get conversation history
   */
  getConversationHistory(sessionId: string): ConversationMessage[] {
    const session = this.sessions.get(sessionId);
    return session?.conversationHistory || [];
  }

  /**
   * Clear conversation history but keep system prompt
   */
  clearHistory(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      const systemMessage = session.conversationHistory.find(
        (msg) => msg.role === 'system',
      );
      session.conversationHistory = systemMessage ? [systemMessage] : [];
    }
  }

  /**
   * End session and cleanup
   */
  endSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.logger.log(`Ended dialogue session: ${sessionId}`);
  }

  /**
   * Cleanup stale sessions (older than 1 hour)
   */
  cleanupStaleSessions(): number {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.lastInteractionTime < oneHourAgo) {
        this.sessions.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.log(`Cleaned up ${cleaned} stale sessions`);
    }

    return cleaned;
  }

  /**
   * Get active session count
   */
  getActiveSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Simple test completion
      await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 5,
      });
      return true;
    } catch (error) {
      this.logger.error('OpenAI health check failed:', error);
      return false;
    }
  }
}
