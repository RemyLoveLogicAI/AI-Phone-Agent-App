# Poke + real-time voice evolution plan

This plan treats Poke as the relationship and orchestration layer while CallOS
owns the latency-critical audio loop. That boundary matters: calendar, inbox,
CRM, and follow-up tools can tolerate normal API latency; turn-taking and
barge-in cannot.

## Recommended topology

```text
Phone (Twilio Media Streams) ─┐
                              ├─ CallOS real-time plane ─ ASR/LLM/TTS
Meet bot / browser WebRTC ────┘            │
                                           ├─ policy + confirmation gate
                                           ├─ adaptive connector registry
                                           └─ Poke / MCP / plugin execution plane
```

1. **Start with phone, then Meet.** The existing Twilio stream is the shortest
   production path. Add a WebRTC/Meet transport only after interruption,
   reconnection, and call-consent behavior meet the latency SLOs.
2. **Keep tools off the audio hot path.** Stream partial ASR immediately and run
   read-only prefetches in parallel. Never delay an acknowledgement while a
   calendar or CRM connector runs.
3. **Adapt manifests, not model prompts.** Register each Poke/MCP/plugin tool via
   `POST /voice/connectors`. The registry namespaces names, preserves JSON input
   schemas, and classifies side-effect risk. This makes a newly discovered tool
   usable without rebuilding the voice application.
4. **Default to confirmation.** Read tools may run speculatively. Write and
   sensitive tools are marked `requiresConfirmation`; the existing policy
   engine remains the final authorization layer. Credentials must stay in a
   separate executor or secret manager and must not appear in manifests.

## Connector manifest

```json
{
  "id": "poke",
  "name": "Poke workspace",
  "version": "1.0.0",
  "transport": "mcp-http",
  "endpoint": "https://your-connector.example/mcp",
  "tools": [{
    "name": "calendar.create",
    "description": "Create a calendar event after the caller confirms",
    "inputSchema": { "type": "object", "required": ["start", "title"] },
    "risk": "write",
    "timeoutMs": 3000
  }]
}
```

Remote endpoints must use HTTPS. Registration stores capabilities only; it does
not execute arbitrary URLs. Add execution only behind authentication, outbound
host allowlists, per-tool timeouts, idempotency keys, policy checks, and an
append-only receipt in the call ledger.

## Latency budget and rollout gates

| Segment | Target p95 |
| --- | ---: |
| Audio ingress + VAD | 80 ms |
| Stable partial transcript | 180 ms |
| First model token | 250 ms |
| First synthesized audio | 180 ms |
| Barge-in clear | 150 ms |

Measure every segment rather than advertising a single synthetic number. Roll
out in shadow mode first: suggest actions but do not execute them. Then enable
read-only tools, confirmed writes, and finally narrowly scoped autonomous writes.

## Next implementation slices

- Wire the production ASR/LLM/TTS pipeline into `VoiceStreamGateway`; it still
  contains placeholder processing.
- Add authenticated connector persistence and an executor worker with retries,
  idempotency, circuit breakers, and auditable receipts.
- Use a supported Meet integration or an explicitly admitted meeting bot. Do
  not rely on hidden browser automation; disclose the AI participant and obtain
  recording/transcription consent.
- Add OpenTelemetry spans for utterance, model, speech, tool, and barge-in timing;
  gate releases on real-call p50/p95/p99 dashboards.

## Verified platform constraints (July 2026)

- Poke documents [MCP server](https://poke.com/docs/mcp-servers) tool discovery,
  API-key/OAuth connections, and local tunneling. Its
  [Recipes](https://poke.com/docs/creating-recipes) package onboarding context,
  required integrations, and first-message behavior, making Recipes the right
  install/distribution surface for CallOS capabilities.
- Poke's [inbound API](https://poke.com/docs/api) accepts event context and can
  use the user's connected email, calendar, reminders, and integrations. It is
  not documented as a streaming-media API, so use it for triggers and call
  outcomes rather than routing audio turns through it.
- [Twilio bidirectional Media Streams](https://www.twilio.com/docs/voice/media-streams)
  are the supported phone media route for the first release.
- The [Google Meet Media API](https://developers.google.com/workspace/meet/media-api/guides/overview)
  provides real-time WebRTC media, but remains Developer Preview and requires
  enrollment for the project, OAuth principal, and conference participants.
  Treat Meet as a gated pilot rather than the production MVP.
