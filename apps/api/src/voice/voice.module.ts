import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';

// Phase 1-2 Services
import { DeepgramService } from './services/deepgram.service';
import { CartesiaService } from './services/cartesia.service';
import { DialogueService } from './services/dialogue.service';
import { LedgerService } from './services/ledger.service';

// Phase 3-6 Services
import { BookingService } from './services/booking.service';
import { RagService } from './services/rag.service';
import { CampaignService } from './services/campaign.service';

// Gateways
import { VoiceGateway } from './voice.gateway';
import { TwilioMediaGateway } from './twilio-media.gateway';

// Controllers
import { VoiceController } from './voice.controller';
import { CampaignController } from './campaign.controller';

/**
 * Voice Module - PHASES 1-6 COMPLETE 🚀
 *
 * Phase 1-2: Core Voice Loop + Telephony ✅
 * Phase 3: Database-Backed Tools ✅
 * Phase 6: RAG + Outbound Campaigns ✅
 * Phase 7-8: Schema Scaffolded (Future)
 */
@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [
    DeepgramService,
    CartesiaService,
    DialogueService,
    LedgerService,
    BookingService,
    RagService,
    CampaignService,
    VoiceGateway,
    TwilioMediaGateway,
  ],
  controllers: [VoiceController, CampaignController],
  exports: [
    DeepgramService,
    CartesiaService,
    DialogueService,
    LedgerService,
    BookingService,
    RagService,
    CampaignService,
  ],
})
export class VoiceModule {}
