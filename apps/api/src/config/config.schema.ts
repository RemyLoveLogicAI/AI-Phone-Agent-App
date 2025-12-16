import { z } from 'zod';

export const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  WS_PORT: z.coerce.number().default(3002),
  DATABASE_URL: z.string().default('file:./dev.db'),

  // Telephony
  TWILIO_ACCOUNT_SID: z.string().min(1),
  TWILIO_AUTH_TOKEN: z.string().min(1),
  TWILIO_PHONE_NUMBER: z.string().min(1),

  // AI / LLM
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().default('gpt-4-turbo-preview'),

  // Voice AI - ASR
  DEEPGRAM_API_KEY: z.string().min(1),

  // Voice AI - TTS
  CARTESIA_API_KEY: z.string().min(1),
  CARTESIA_VOICE_ID: z.string().default('a0e99841-438c-4a64-b679-ae501e7d6091'),

  // Voice Configuration
  VOICE_LANGUAGE: z.string().default('en'),
  VOICE_SAMPLE_RATE: z.coerce.number().default(16000),
  ENABLE_BARGE_IN: z.coerce.boolean().default(true),
  MAX_CALL_DURATION_SECONDS: z.coerce.number().default(1800),

  // Privacy
  PRIVACY_MODE: z.enum(['LOCAL_ONLY', 'HYBRID', 'BUSINESS']).default('HYBRID'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  ENABLE_EVENT_LOGGING: z.coerce.boolean().default(true),
});

export type Config = z.infer<typeof configSchema>;
