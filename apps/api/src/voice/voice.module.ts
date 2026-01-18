import { Module } from '@nestjs/common';
import { VoiceStreamGateway } from './voice-stream.gateway';
import { VoiceController } from './voice.controller';
import { CallLedgerService } from './services/call-ledger.service';
import { ShadowBrainService } from './services/shadow-brain.service';
import { PolicyEngineService } from './services/policy-engine.service';
import { TrustScoringService } from './services/trust-scoring.service';
import { IntelligencePackService } from './services/intelligence-pack.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * CallOS Voice Module
 *
 * Implements the Realtime Interaction Plane with:
 * - WebSocket gateway for Twilio Media Streams
 * - Call Ledger (append-only event store)
 * - Shadow Brain (parallel analysis)
 * - Policy Engine (tool gating)
 * - Trust Scoring (caller verification)
 * - Intelligence Pack generation (<30s post-call)
 */
@Module({
  imports: [PrismaModule],
  controllers: [VoiceController],
  providers: [
    VoiceStreamGateway,
    CallLedgerService,
    ShadowBrainService,
    PolicyEngineService,
    TrustScoringService,
    IntelligencePackService,
  ],
  exports: [
    VoiceStreamGateway,
    CallLedgerService,
    ShadowBrainService,
    PolicyEngineService,
    TrustScoringService,
    IntelligencePackService,
  ],
})
export class VoiceModule {}
