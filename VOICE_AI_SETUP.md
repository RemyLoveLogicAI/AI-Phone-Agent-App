# Voice AI Setup Guide

## Overview

This is a production-ready voice AI phone agent system implementing Phase 1 (Core Loop Demo) and Phase 2 (Telephony & Tools) from the LoveLogicAI VoiceOps Technical Blueprint.

### Architecture

```
┌──────────────┐         ┌─────────────────────────────────┐
│   Browser    │◄───────►│   NestJS API (Port 3001)        │
│   Web App    │  HTTP   │                                 │
│  (Port 3000) │  WS     │  ┌──────────────────────────┐   │
└──────────────┘         │  │  Voice Module            │   │
                         │  │  ├── VoiceGateway        │   │
      OR                 │  │  ├── TwilioMediaGateway  │   │
                         │  │  ├── DeepgramService     │   │
┌──────────────┐         │  │  ├── CartesiaService     │   │
│  Twilio      │◄───────►│  │  ├── DialogueService     │   │
│  Phone Call  │  Media  │  │  └── LedgerService       │   │
└──────────────┘  Stream │  └──────────────────────────┘   │
                         │                                 │
                         │  Database: SQLite/Postgres      │
                         └─────────────────────────────────┘
```

### Tech Stack

- **ASR (Speech-to-Text)**: Deepgram Nova-2 with streaming
- **TTS (Text-to-Speech)**: Cartesia Sonic with ultra-low latency
- **LLM (Dialogue)**: OpenAI GPT-4 Turbo
- **Telephony**: Twilio Media Streams
- **Backend**: NestJS with WebSockets
- **Frontend**: Next.js with Web Audio API
- **Database**: SQLite (dev) / PostgreSQL (production)

## Prerequisites

1. **Node.js** >= 18.x
2. **npm** >= 9.x
3. **API Keys**:
   - Deepgram API Key ([get here](https://console.deepgram.com))
   - Cartesia API Key ([get here](https://play.cartesia.ai))
   - OpenAI API Key ([get here](https://platform.openai.com/api-keys))
   - Twilio Account SID & Auth Token ([get here](https://console.twilio.com))

## Installation

### 1. Install Dependencies

```bash
# Install all workspace dependencies
npm install

# Or install per workspace
npm install --workspace=apps/api
npm install --workspace=apps/web
```

### 2. Configure Environment Variables

Copy the example environment file and fill in your API keys:

```bash
cd apps/api
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Database
DATABASE_URL="file:./dev.db"
PORT=3001
NODE_ENV=development

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890

# OpenAI
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4-turbo-preview

# Deepgram
DEEPGRAM_API_KEY=your_deepgram_api_key_here

# Cartesia
CARTESIA_API_KEY=your_cartesia_api_key_here
CARTESIA_VOICE_ID=a0e99841-438c-4a64-b679-ae501e7d6091

# Voice Configuration
VOICE_LANGUAGE=en
VOICE_SAMPLE_RATE=16000
ENABLE_BARGE_IN=true
MAX_CALL_DURATION_SECONDS=1800

# Logging
LOG_LEVEL=debug
ENABLE_EVENT_LOGGING=true
```

### 3. Setup Database

```bash
cd apps/api
npx prisma migrate dev --name init
npx prisma generate
```

If migration fails due to network issues, use:

```bash
PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 npx prisma db push
```

## Running the Application

### Development Mode

Run both API and web app concurrently:

```bash
# From project root
npm run dev
```

Or run individually:

```bash
# Terminal 1: API
npm run dev --workspace=apps/api

# Terminal 2: Web App
npm run dev --workspace=apps/web
```

### Access Points

- **Web App**: http://localhost:3000
- **Voice Demo**: http://localhost:3000/voice-demo
- **API**: http://localhost:3001
- **API Health**: http://localhost:3001/voice/health

## Testing the Voice AI

### Browser Voice Demo

1. Navigate to http://localhost:3000/voice-demo
2. Click "Connect to Voice Agent"
3. Click "Start Listening" and grant microphone access
4. Start speaking naturally
5. The AI will transcribe your speech and respond with voice

### Twilio Phone Calls

#### Setup Twilio Webhook

1. Buy a phone number in Twilio Console
2. Configure the voice webhook to point to your server:
   ```
   https://your-domain.com/voice/twilio/incoming
   ```
   For local development, use ngrok:
   ```bash
   ngrok http 3001
   # Use the ngrok URL: https://xxx.ngrok.io/voice/twilio/incoming
   ```

3. Call your Twilio number and talk to the AI!

## API Reference

### Voice Endpoints

#### Health Check
```
GET /voice/health
```

Response:
```json
{
  "status": "healthy",
  "services": {
    "deepgram": "up",
    "cartesia": "up",
    "dialogue": "up"
  },
  "timestamp": "2025-12-16T04:20:00.000Z"
}
```

#### Get Call Transcript
```
GET /voice/transcript/:callId
```

Response:
```json
{
  "callId": "uuid",
  "transcript": [
    {
      "timestamp": "2025-12-16T04:20:00.000Z",
      "speaker": "user",
      "text": "Hello, how are you?"
    },
    {
      "timestamp": "2025-12-16T04:20:02.000Z",
      "speaker": "ai",
      "text": "I'm doing great! How can I help you today?"
    }
  ],
  "count": 2
}
```

#### Get Call Statistics
```
GET /voice/stats/:callId
```

Response:
```json
{
  "callId": "uuid",
  "totalEvents": 47,
  "eventCounts": {
    "call_started": 1,
    "transcript_final": 5,
    "ai_response": 5,
    "tts_complete": 5
  },
  "durationMs": 120000,
  "durationSeconds": 120,
  "bargeInCount": 2,
  "errorCount": 0
}
```

#### Get Call Events (Ledger)
```
GET /voice/events/:callId
```

Returns all events logged for debugging and analysis.

#### List Available Voices
```
GET /voice/voices
```

Returns available Cartesia voices for TTS.

### WebSocket Events

#### Browser Client → Server

- `audio`: Send audio chunk
  ```json
  {
    "audio": [0.1, 0.2, ...],
    "sampleRate": 16000
  }
  ```

- `barge_in`: Interrupt AI speaking

#### Server → Browser Client

- `ready`: Connection established
- `transcript`: User speech transcription
  ```json
  {
    "text": "hello world",
    "isFinal": true
  }
  ```
- `audio`: AI voice response
  ```json
  {
    "audio": [0.1, 0.2, ...],
    "sampleRate": 16000
  }
  ```
- `tts_complete`: AI finished speaking
- `clear_audio`: Clear playback queue

## Production Deployment

### Environment Variables for Production

Update `.env` for production:

```env
NODE_ENV=production
DATABASE_URL="postgresql://user:password@host:5432/dbname"
PORT=3001

# Use production URLs for Twilio webhooks
# Update CORS settings in voice.gateway.ts
```

### Database Migration

For production, use PostgreSQL:

```bash
# Update DATABASE_URL in .env
# Run migrations
npx prisma migrate deploy
npx prisma generate
```

### Build and Deploy

```bash
# Build API
npm run build --workspace=apps/api

# Build Web App
npm run build --workspace=apps/web

# Start in production
npm run start --workspace=apps/api
npm run start --workspace=apps/web
```

### Recommended Hosting

- **API**: Railway, Render, AWS EC2, DigitalOcean
- **Web App**: Vercel, Netlify, CloudFlare Pages
- **Database**: Railway PostgreSQL, AWS RDS, Supabase

### Important: WebSocket Configuration

Ensure your hosting platform supports WebSockets:

- Enable WebSocket support
- Configure proper timeout settings
- Use sticky sessions if load balancing

### Twilio Media Stream Requirements

- Must use WSS (secure WebSocket)
- Public HTTPS endpoint required
- Low latency network connection recommended

## Monitoring & Debugging

### Event Logging

All voice interactions are logged to the `ledger_events` table:

```sql
SELECT * FROM ledger_events WHERE callId = 'your-call-id' ORDER BY timestamp;
```

### Common Issues

#### "Deepgram connection failed"
- Check `DEEPGRAM_API_KEY` is correct
- Verify network connectivity
- Check API quota

#### "Cartesia TTS error"
- Verify `CARTESIA_API_KEY`
- Check `CARTESIA_VOICE_ID` is valid
- Test with `/voice/voices` endpoint

#### "No audio in browser"
- Grant microphone permissions
- Check browser console for errors
- Verify WebSocket connection
- Try different browser (Chrome/Edge recommended)

#### "Twilio call doesn't connect"
- Verify webhook URL is publicly accessible
- Check Twilio debugger in console
- Ensure WSS protocol (not WS)
- Review Twilio logs

### Performance Tuning

- **Latency**: Typical end-to-end latency is 800ms-1.5s
- **Barge-in**: Enable with `ENABLE_BARGE_IN=true`
- **Audio Quality**: Adjust `VOICE_SAMPLE_RATE` if needed
- **Concurrency**: Monitor active sessions with `/voice/service-stats`

## Next Steps

### Phase 3: Enterprise Hardening
- [ ] Add barge-in optimization
- [ ] Implement session persistence
- [ ] Add database-backed tools (calendar, booking)
- [ ] Enhanced error recovery

### Phase 4: Multi-Tenancy
- [ ] Template registry for different agents
- [ ] SMS integration
- [ ] Multi-language support

### Phase 5+: Intelligence & Scale
- [ ] RAG knowledge base integration
- [ ] Outbound calling campaigns
- [ ] QA scoring system
- [ ] Long-term memory

## Support

For issues or questions:
- Check logs: `LOG_LEVEL=debug`
- Review ledger events: `GET /voice/events/:callId`
- Test health endpoint: `GET /voice/health`

## License

Proprietary - LoveLogicAI VoiceOps
