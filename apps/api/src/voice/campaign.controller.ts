import { Controller, Get, Post, Put, Delete, Body, Param, Logger } from '@nestjs/common';
import { CampaignService } from './services/campaign.service';
import { RagService } from './services/rag.service';
import { BookingService } from './services/booking.service';

/**
 * Campaign & Advanced Features Controller
 * Handles Phase 3-6 features
 */
@Controller('campaign')
export class CampaignController {
  private readonly logger = new Logger(CampaignController.name);

  constructor(
    private readonly campaignService: CampaignService,
    private readonly ragService: RagService,
    private readonly bookingService: BookingService,
  ) {}

  // ========== CAMPAIGNS ==========

  @Post()
  async createCampaign(@Body() data: any) {
    return this.campaignService.createCampaign(data);
  }

  @Post(':id/contacts')
  async addContacts(@Param('id') id: string, @Body() data: { contacts: any[] }) {
    return this.campaignService.addContacts(id, data.contacts);
  }

  @Post(':id/start')
  async startCampaign(@Param('id') id: string) {
    return this.campaignService.startCampaign(id);
  }

  @Put(':id/pause')
  async pauseCampaign(@Param('id') id: string) {
    return this.campaignService.pauseCampaign(id);
  }

  @Get(':id/stats')
  async getCampaignStats(@Param('id') id: string) {
    return this.campaignService.getCampaignStats(id);
  }

  // ========== RAG / KNOWLEDGE BASE ==========

  @Post('knowledge/ingest')
  async ingestKnowledge(@Body() data: {
    content: string;
    source?: string;
    metadata?: any;
  }) {
    const count = await this.ragService.ingestDocument(data);
    return { success: true, chunksIngested: count };
  }

  @Post('knowledge/search')
  async searchKnowledge(@Body() data: { query: string; limit?: number }) {
    return this.ragService.search(data.query, data.limit || 5);
  }

  @Get('knowledge/stats')
  async getKnowledgeStats() {
    return this.ragService.getStats();
  }

  @Delete('knowledge/source/:source')
  async deleteKnowledge(@Param('source') source: string) {
    const count = await this.ragService.deleteBySource(source);
    return { success: true, deletedCount: count };
  }

  // ========== BOOKING TOOLS ==========

  @Post('booking/check')
  async checkAvailability(@Body() data: {
    time: string;
    duration?: number;
  }) {
    return this.bookingService.checkAvailability(
      new Date(data.time),
      data.duration,
    );
  }

  @Post('booking')
  async createBooking(@Body() data: any) {
    return this.bookingService.createBooking({
      ...data,
      scheduledAt: new Date(data.scheduledAt),
    });
  }

  @Get('booking/upcoming')
  async listUpcoming() {
    return this.bookingService.listUpcomingBookings();
  }
}
