# 🎙️ LoveLogicAI VoiceOps - Voice AI Phone Agent

Production-ready voice AI system with real-time speech recognition, natural language understanding, and ultra-low latency text-to-speech.

## ✨ Features

### Phase 1: Core Loop Demo ✅
- ✅ Browser-based voice interaction
- ✅ Real-time speech-to-text (Deepgram Nova-2)
- ✅ AI dialogue management (OpenAI GPT-4)
- ✅ Ultra-low latency TTS (Cartesia Sonic)
- ✅ WebSocket audio streaming
- ✅ Event logging & analytics

### Phase 2: Telephony & Tools ✅
- ✅ Twilio Media Stream integration
- ✅ Real phone call handling
- ✅ μ-law audio codec support
- ✅ Call transcription
- ✅ Call analytics & statistics

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure API Keys
```bash
cd apps/api
cp .env.example .env
# Edit .env with your API keys
```

Required API keys:
- [Deepgram](https://console.deepgram.com) - Speech recognition
- [Cartesia](https://play.cartesia.ai) - Text-to-speech
- [OpenAI](https://platform.openai.com/api-keys) - AI dialogue
- [Twilio](https://console.twilio.com) - Phone integration

### 3. Setup Database
```bash
cd apps/api
npx prisma migrate dev --name init
```

### 4. Run Application
```bash
# From project root
npm run dev
```

### 5. Test Voice AI
Open http://localhost:3000/voice-demo and start talking!

## 📚 Documentation

- **[Complete Setup Guide](./VOICE_AI_SETUP.md)** - Detailed installation and configuration
- **[API Reference](./VOICE_AI_SETUP.md#api-reference)** - REST and WebSocket API docs
- **[Deployment Guide](./VOICE_AI_SETUP.md#production-deployment)** - Production deployment instructions

## 🏗️ Architecture

```
Browser/Phone → WebSocket → Deepgram ASR → OpenAI GPT-4 → Cartesia TTS → Browser/Phone
                              ↓
                         Event Logging
                              ↓
                          Database
```

**Core Components:**
- `DeepgramService` - Streaming speech recognition
- `CartesiaService` - Low-latency text-to-speech
- `DialogueService` - OpenAI conversation management
- `LedgerService` - Event logging & analytics
- `VoiceGateway` - Browser WebSocket handler
- `TwilioMediaGateway` - Twilio phone call handler

## 🔧 Technology Stack

| Component | Technology |
|-----------|-----------|
| Backend | NestJS + TypeScript |
| Frontend | Next.js + React |
| Database | SQLite (dev) / PostgreSQL (prod) |
| ASR | Deepgram Nova-2 |
| TTS | Cartesia Sonic |
| LLM | OpenAI GPT-4 Turbo |
| Telephony | Twilio Media Streams |
| Real-time | Socket.io WebSockets |

## 📁 Project Structure

```
apps/
  api/                      # NestJS backend
    src/
      voice/                # Voice AI module
        services/
          deepgram.service.ts    # ASR
          cartesia.service.ts    # TTS
          dialogue.service.ts    # AI dialogue
          ledger.service.ts      # Event logging
        utils/
          audio.util.ts          # Audio processing
        voice.gateway.ts         # Browser WebSocket
        twilio-media.gateway.ts  # Twilio handler
        voice.controller.ts      # REST API
        voice.module.ts          # Module definition
  web/                      # Next.js frontend
    components/
      VoiceAgent.js         # Voice client component
    pages/
      voice-demo.js         # Demo page
```

## 🎯 Use Cases

- **Customer Support** - 24/7 AI phone agent
- **Appointment Scheduling** - Voice-based booking
- **Lead Qualification** - Automated screening calls
- **Information Hotlines** - Automated Q&A
- **Voice Surveys** - Interactive voice polls
- **Internal Tools** - Voice-controlled workflows

## 📊 Performance

- **End-to-end Latency**: 800ms - 1.5s
- **ASR Accuracy**: 95%+ (Deepgram Nova-2)
- **TTS Quality**: Human-like (Cartesia Sonic)
- **Concurrent Calls**: Scalable with load balancing
- **Barge-in Support**: Real-time interruption detection

## 🔐 Security & Privacy

- API keys secured via environment variables
- Event logging with privacy controls
- Configurable data retention
- HTTPS/WSS encryption
- Compliance-ready architecture

## 🐛 Debugging

Check system health:
```bash
curl http://localhost:3001/voice/health
```

View call transcript:
```bash
curl http://localhost:3001/voice/transcript/{callId}
```

Get call statistics:
```bash
curl http://localhost:3001/voice/stats/{callId}
```

## 🚀 Deployment

### Quick Deploy Options

**API:**
- Railway: One-click deploy
- Render: Auto-deploy from Git
- AWS EC2: Full control

**Web App:**
- Vercel: Next.js optimized
- Netlify: Edge functions
- CloudFlare Pages: Global CDN

**Database:**
- Railway PostgreSQL
- Supabase
- AWS RDS

See [Deployment Guide](./VOICE_AI_SETUP.md#production-deployment) for details.

## 🗺️ Roadmap

### Phase 3: Enterprise Hardening (Next)
- [ ] Database-backed tools (calendar, booking)
- [ ] Enhanced barge-in logic
- [ ] Session persistence & recovery
- [ ] Multi-language support

### Phase 4: Multi-Tenancy
- [ ] Template registry for custom agents
- [ ] SMS follow-up integration
- [ ] White-label support

### Phase 5+: Intelligence & Scale
- [ ] RAG knowledge base (vector search)
- [ ] Outbound campaign manager
- [ ] Human handoff protocol
- [ ] QA scoring & analytics
- [ ] Long-term memory system

## 📝 Environment Variables

Essential configuration in `apps/api/.env`:

```env
# AI Services
DEEPGRAM_API_KEY=          # Speech recognition
CARTESIA_API_KEY=          # Text-to-speech
OPENAI_API_KEY=            # Dialogue AI

# Telephony
TWILIO_ACCOUNT_SID=        # Phone integration
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Configuration
VOICE_LANGUAGE=en          # Language code
ENABLE_BARGE_IN=true       # Allow interruptions
LOG_LEVEL=debug            # Logging verbosity
```

See `.env.example` for complete configuration.

## 🤝 Contributing

This is a proprietary project. For questions or support, contact the development team.

## 📄 License

Proprietary - LoveLogicAI VoiceOps

---

**Built with ❤️ by LoveLogicAI Team**

For detailed setup instructions, see [VOICE_AI_SETUP.md](./VOICE_AI_SETUP.md)
