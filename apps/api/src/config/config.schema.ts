import { z } from 'zod';

export const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  
  // Telephony
  TWILIO_ACCOUNT_SID: z.string().min(1),
  TWILIO_AUTH_TOKEN: z.string().min(1),
  TWILIO_PHONE_NUMBER: z.string().min(1),
  
  // AI
  OPENAI_API_KEY: z.string().optional(),
  
  // Privacy
  PRIVACY_MODE: z.enum(['LOCAL_ONLY', 'HYBRID', 'BUSINESS']).default('HYBRID'),
});

export type Config = z.infer<typeof configSchema>;
