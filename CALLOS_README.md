# CallOS - Communication Operating System

**Version:** Phase A (MVP) - v1.0.0
**Status:** Implementation Complete
**Company:** LoveLogicAI LLC

---

## Executive Summary

CallOS transforms every communication touchpoint—voice, SMS, email, chat—into an intelligent, autonomous, auditable interaction managed by a coordinated AI workforce that knows your preferences, protects your time, and executes your intentions without ever putting you at risk.

**CallOS is not an IVR upgrade.** It is a category-defining Communication Operating System that replaces call centers, front desks, and large chunks of human coordination while remaining safe, auditable, and infinitely scalable.

## Phase A (MVP) - What's Implemented

✅ **Realtime Interaction Plane**
- Twilio Media Streams WebSocket gateway
- Bidirectional audio streaming (μ-law 8kHz)
- Barge-in detection with <900ms response time
- Twilio 'clear' semantics for instant audio interruption
- Adaptive jitter buffer (20ms target, 100ms max)

✅ **Shadow Intelligence Plane**
- Parallel analysis engine running separate from voice loop
- Intent classification with probability distribution
- Entity extraction (names, numbers, amounts, etc.)
- Scam detection with tactics signatures
- Emotional state analysis
- Compliance trigger detection
- Tool recommendations with bounded parameters

✅ **Trust & Authenticity Plane**
- Multi-dimensional trust scoring (0-4 tier system)
- STIR/SHAKEN attestation integration
- Historical call count tracking
- Scam pattern matching
- Verification methods (OTP, callback, voiceprint)
- VIP and block list management
- Auto-activation protection scripts for high-confidence scams

✅ **Action Execution Plane (Policy Engine)**
- Tool gating with permission system
- Execution modes: auto, confirm_first, require_approval, deny
- Trust tier requirements per tool
- Rate limiting per tool
- Time window constraints
- Discount ceilings for price negotiation
- Escalation trigger detection

✅ **Governance & Audit Plane (Call Ledger)**
- Append-only event store for complete audit trail
- Event types: transcript_delta, intent_update, tool_intent, policy_decision, tool_result, escalation, takeover, call_end
- Model lineage tracking (prompt version, model name, latency, tokens, cost)
- Timeline replay for audit explorer
- Human-readable event descriptions
- Call statistics and metrics

✅ **Intelligence Pack Generation**
- Post-call comprehensive summary (<30s target)
- 4-part summary: what happened, what they want, what we did, what you should do
- Entity extraction and structuring
- Intent distribution
- Actions taken log
- Suggested follow-ups with priorities
- Audit trail summary
- Risk flags identification

✅ **Playbook System**
- Personal Playbook: AI gatekeeper for individuals
- Business Playbook: Always-on receptionist for SMBs
- Support Playbook: Tier-1 customer support agent
- Customizable personas (voice, speaking rate, warmth)
- Qualification flows
- Tool permissions per playbook
- Escalation triggers
- Compliance disclosures
- Conversation strategies

## Architecture Overview

CallOS operates through **six interconnected architectural planes**:

### 1. Realtime Interaction Plane

**Goal:** Near-human turn-taking with <400ms response latency

**Components:**
- `voice-stream.gateway.ts` - WebSocket handler for Twilio Media Streams
- Jitter buffer management
- Voice Activity Detection (VAD)
- Barge-in detection and handling
- TTS/ASR integration points

**Key Features:**
- True barge-in with <900ms response
- Floor control (agent never fights caller)
- Prosody awareness
- Bridge phrases for latency masking
- Conversation pacing

### 2. Shadow Intelligence Plane

**Goal:** Deep analysis parallel to voice output

**Components:**
- `shadow-brain.service.ts` - Continuous analysis engine
- Intent classifier
- Entity extractor
- Scam detector
- Emotional state analyzer

**Update Frequency:** Every 500ms (non-blocking)

**Analysis Outputs:**
- Intent probability distribution
- Extracted entities
- Scam tactics signatures
- Emotional state signals
- Compliance triggers
- Next-best questions
- Outcome predictions
- Tool recommendations

### 3. Trust & Authenticity Plane

**Goal:** Multi-dimensional caller trust scoring

**Components:**
- `trust-scoring.service.ts` - Trust computation engine

**Trust Tiers:**
- **Tier 0:** Unknown caller → Qualification only
- **Tier 1:** Known number → View public info
- **Tier 2:** Verified via OTP → Schedule holds, send docs
- **Tier 3:** VIP/trusted → Full disclosure, negotiation
- **Tier 4:** Internal staff → All tools, overrides

**Score Computation:**
```
Trust Score = Σ(feature_weight × feature_value)
```

**Features:**
- STIR/SHAKEN attestation (+0.2 for A, +0.1 for B)
- Historical call count (+0.05 per call, max +0.5)
- Scam pattern match (-0.3 to -0.9)
- Verification completion (+0.3 for OTP, +0.2 for callback)
- Time-of-day anomaly (-0.1 for unusual hours)
- Geographic consistency (+0.1 if matches history)

### 4. Action Execution Plane

**Goal:** Autonomous within guardrails

**Components:**
- `policy-engine.service.ts` - Policy enforcement

**Action Classifications:**
- **Soft Actions:** Send SMS, create ticket, update notes → Auto-execute
- **Medium Actions:** Schedule hold, send document → Confirm-first or auto based on trust
- **Hard Actions:** Book appointment, negotiate, payment → Always confirm + audit

**Policy Decision Factors:**
- Trust tier requirement
- Rate limits
- Time windows
- Specific constraints (e.g., discount ceiling)
- Execution mode

### 5. Governance & Audit Plane

**Goal:** Enterprise-grade audit trail

**Components:**
- `call-ledger.service.ts` - Event logging system

**Always Captured:**
- Event timeline with timestamps
- Model lineage (version, latency, cost)
- Policy decisions with reasoning
- Tool invocations and results
- Human interventions (escalations, takeovers)

**Event Types:**
- `transcript_delta` - ASR updates
- `intent_update` - Intent classification changes
- `tool_intent` - Agent wants to use tool
- `policy_decision` - Policy engine ruling
- `tool_result` - Tool execution result
- `escalation` - Human intervention triggered
- `takeover` - Owner took control
- `call_end` - Call terminated

### 6. Intelligence Pack Service

**Goal:** <30s post-call comprehensive summary

**Components:**
- `intelligence-pack.service.ts` - Summary generator

**Output Schema:**
```json
{
  "callId": "...",
  "durationSeconds": 187,
  "summary": {
    "whatHappened": "...",
    "whatTheyWant": "...",
    "whatWeDid": "...",
    "whatYouShouldDo": "...",
    "riskFlags": [...]
  },
  "entities": {...},
  "trustScore": 0.82,
  "intentDistribution": {...},
  "actionsTaken": [...],
  "suggestedFollowups": [...],
  "auditTrail": {...}
}
```

## Database Schema

### Core Models

**User**
- id, email, name
- Relationships: policies, playbooks, memories

**Contact**
- id, phoneNumber, name, email, tags, notes
- Trust fields: trustTier, trustScore, isVIP, isBlocked, preferences
- Relationships: calls, messages, voicemails, trustScores, memories

**Call**
- id, sid (Twilio CallSid), direction, status, duration
- transcript, summary, recordingUrl
- CallOS fields: playbookId, intentDistribution, emotionalState, trustScores, scamConfidence, escalation data
- Relationships: contact, playbook, events, intelligencePack

### CallOS Models

**CallEvent** (Call Ledger)
- id, callId, eventType, timestamp
- payload (JSON), modelVersion, latencyMs
- Index: (callId, timestamp)

**Policy** (Policy Engine)
- id, userId, name, description, isActive
- toolPermissions (JSON), escalationTriggers (JSON), disclosureRules (JSON)

**Playbook** (Conversation Flows)
- id, userId, name, version, author, isActive
- Persona: voiceId, speakingRate, warmth
- Flow: openingVariants, qualificationFlow, toolPermissions, escalationTriggers, compliance, retention

**Memory** (Multi-layer Memory)
- id, userId, contactId
- layer (ephemeral, session, contact, org, outcome)
- key, value (JSON)
- isPinned, isRedacted, expiresAt

**TrustScore** (Trust History)
- id, contactId, score, tier
- Features: stirShakenAttestation, historicalCallCount, scamPatternScore, verificationMethod, timeOfDayAnomaly, geographicConsistency
- reason

**IntelligencePack** (Post-call Summaries)
- id, callId
- Summary: whatHappened, whatTheyWant, whatWeDid, whatYouShouldDo, riskFlags
- entities, intentDistribution, actionsTaken, suggestedFollowups, auditSummary
- generatedAt, processingTimeMs

## API Endpoints

### Health & Monitoring

```
GET /voice/health
GET /voice/sessions
```

### Call Management

```
GET /voice/calls/:callId/events       # Full event log
GET /voice/calls/:callId/timeline     # Human-readable timeline
GET /voice/calls/:callId/stats        # Call statistics
GET /voice/calls/:callId/intelligence # Intelligence pack
POST /voice/calls/:callId/intelligence/generate
```

### Trust Scoring

```
POST /voice/trust/score   # Compute trust score
POST /voice/trust/vip     # Mark as VIP
POST /voice/trust/block   # Block contact
```

### Policy Engine

```
POST /voice/policy/check     # Check tool policy
POST /voice/policy           # Create/update policy
POST /voice/policy/escalate  # Check escalation
```

## Starter Playbooks

### 1. Personal Playbook

**For:** Individuals who want an AI gatekeeper

**Features:**
- Screens unknown callers
- Blocks spam automatically (scam confidence > 0.7)
- Takes messages for known contacts
- Handles appointment scheduling
- Personal boundary protection

**Persona:** Professional, warm (0.8), standard speed

**Key Strategies:**
- Spam handling with auto-reject
- Unknown caller screening
- VIP immediate escalation
- Message taking with confirmation

### 2. Business Playbook

**For:** SMBs needing always-on receptionist

**Features:**
- Professional greeting and routing
- Lead qualification and scoring
- Appointment scheduling with calendar
- Customer support triage
- Operating hours enforcement

**Persona:** Professional, formal (0.7), standard speed

**Lead Scoring Factors:**
- Budget mentioned (0.3 weight)
- Timeline mentioned (0.2 weight)
- Authority signals (0.3 weight)
- Fit indicators (0.2 weight)

**Qualify threshold:** 0.5 (auto-schedule)
**Hot lead threshold:** 0.8 (immediate escalation)

### 3. Support Playbook

**For:** Customer support operations

**Features:**
- Issue classification and severity assessment
- Ticket creation and tracking
- Self-service option offering
- Knowledge base integration
- Smart escalation to human agents

**Persona:** Empathetic, warm (0.9), slightly slower (0.95)

**Severity Levels:**
- **Critical (1.0):** Escalate, 15min SLA, notify manager
- **High (0.8):** 2hr SLA
- **Medium (0.5):** 24hr SLA, offer self-service
- **Low (0.2):** 48hr SLA, offer self-service

## WebSocket Gateway

**Path:** `/voice/stream`

**Twilio Events Handled:**
- `connected` - Connection established
- `start` - Stream started, initialize session
- `media` - Audio chunk received
- `stop` - Stream ended, cleanup
- `mark` - Timing synchronization

**Barge-in Flow:**
1. Detect speech during TTS playback (VAD)
2. Send `clear` event to Twilio (stops buffered audio)
3. Mark session as not playing
4. Send acknowledgment phrase
5. Target latency: <900ms

## Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| Voice Response Latency | <400ms | ⚠️ Pending OpenAI Realtime API |
| Barge-in Response | <900ms | ✅ Implemented |
| Intelligence Pack Generation | <30s | ✅ Implemented |
| Trust Score Computation | <2s | ✅ Implemented |
| Event Logging Latency | Non-blocking | ✅ Implemented |

## Security & Compliance

**Data Protection:**
- Append-only event logs (immutable)
- Trust tier-based disclosure rules
- Redaction capability for sensitive data
- Encryption at rest (database level)

**Compliance Features:**
- TCPA: Consent tracking, AI disclosure, opt-out handling
- CCPA: Right to delete, access logs, data portability
- Two-Party Consent: Geo-aware recording disclosure

**Audit Trail:**
- Every action logged with reasoning
- Model lineage tracked
- Policy decisions recorded
- Timeline replay capability

## Next Steps (Phase B - Operator Grade)

The following features are planned for Phase B:

- [ ] Live dashboard with transcript + interventions
- [ ] Approvals queue with push notifications
- [ ] One-click takeover with instant brief
- [ ] Scam Sentinel with auto-activation scripts
- [ ] Google Calendar + Calendly integration
- [ ] Zendesk/Freshdesk ticket creation

## Installation & Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Twilio account
- OpenAI API key

### Environment Variables

```bash
# Database
DATABASE_URL="file:./dev.db"

# Server
PORT=3001
NODE_ENV=development

# Twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_phone_number

# OpenAI
OPENAI_API_KEY=your_api_key

# Privacy
PRIVACY_MODE=HYBRID  # LOCAL_ONLY, HYBRID, BUSINESS
```

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
cd apps/api && npx prisma generate

# Run migrations
npx prisma migrate dev

# Start API server
npm run dev
```

### Testing WebSocket Gateway

```bash
# Start API server
cd apps/api && npm run dev

# WebSocket available at:
ws://localhost:3001/voice/stream
```

## Development Guide

### Adding a New Tool

1. Define tool permission in Policy Engine:

```typescript
toolPermissions: {
  my_new_tool: {
    mode: ExecutionMode.CONFIRM_FIRST,
    trustTierRequired: 2,
    rateLimit: '5/hour',
  },
}
```

2. Implement tool handler
3. Add to playbook tool permissions
4. Test policy checks

### Creating a Custom Playbook

See `/apps/api/src/voice/playbooks/` for examples.

Required fields:
- `id` - Unique identifier
- `name` - Display name
- `version` - Semver version
- `persona` - Voice configuration
- `openingVariants` - Greeting options
- `qualificationFlow` - Questions to ask
- `toolPermissions` - Tool access rules
- `escalationTriggers` - When to escalate

### Adding Event Types

1. Add to `CallEventType` enum in `call-ledger.service.ts`
2. Create logging method
3. Add to timeline description generator

## Architecture Decisions

### Why Append-Only Event Logs?

- **Immutability:** Audit trail cannot be tampered with
- **Replay:** Full conversation reconstruction
- **Debugging:** Understand exactly what happened and why
- **Compliance:** Required for regulated industries

### Why Shadow Brain Parallel Analysis?

- **Speed:** Voice loop stays <400ms while analysis runs deep
- **Intelligence:** Can use slower, more accurate models
- **Non-blocking:** Analysis never delays the caller
- **Progressive:** Gets smarter as conversation continues

### Why Trust Tiers Instead of Binary Allow/Deny?

- **Gradual Trust:** Build relationship over time
- **Risk Management:** Share information proportional to trust
- **User Control:** Fine-grained access control
- **Scam Protection:** Unknown = restricted by default

### Why Policy Engine Instead of Hardcoded Rules?

- **Customization:** Each user defines their own policies
- **Safety:** Autonomous actions only within approved boundaries
- **Auditability:** Every decision logged with reasoning
- **Evolution:** Policies can be updated without code changes

## Testing Strategy

### Unit Tests

```bash
# Run unit tests
npm run test

# Run with coverage
npm run test:cov
```

### Integration Tests

```bash
# Run E2E tests
npm run test:e2e
```

### Manual Testing

1. **WebSocket Connection:** Use wscat to test connection
2. **Trust Scoring:** POST to `/voice/trust/score`
3. **Policy Checks:** POST to `/voice/policy/check`
4. **Intelligence Pack:** Generate for test call

## Contributing

### Code Style

- Use Prettier for formatting
- Follow NestJS conventions
- Document all public methods
- Add JSDoc comments for complex logic

### Commit Messages

Follow conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `refactor:` Code refactoring
- `test:` Tests
- `chore:` Maintenance

## License

Proprietary - LoveLogicAI LLC

---

**Built with:**
- NestJS
- Prisma
- Twilio
- OpenAI
- WebSockets
- TypeScript

**CallOS** - Transforming Adversity into Innovation
© 2024 LoveLogicAI LLC
