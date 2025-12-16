import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { Config } from '../../config/config.schema';
import * as Twilio from 'twilio';

/**
 * Phase 6: Campaign Service
 * Manages outbound calling campaigns
 */
@Injectable()
export class CampaignService {
  private readonly logger = new Logger(CampaignService.name);
  private readonly twilioClient: Twilio.Twilio;
  private readonly twilioNumber: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<Config>,
  ) {
    const accountSid = this.configService.get('TWILIO_ACCOUNT_SID', { infer: true });
    const authToken = this.configService.get('TWILIO_AUTH_TOKEN', { infer: true });
    this.twilioNumber = this.configService.get('TWILIO_PHONE_NUMBER', { infer: true });

    this.twilioClient = Twilio(accountSid, authToken);
  }

  /**
   * Create a new campaign
   */
  async createCampaign(data: {
    name: string;
    description?: string;
    script?: string;
    startTime?: Date;
    endTime?: Date;
  }) {
    return this.prisma.campaign.create({
      data: {
        ...data,
        status: 'draft',
      },
    });
  }

  /**
   * Add contacts to campaign
   */
  async addContacts(
    campaignId: string,
    contacts: Array<{
      phoneNumber: string;
      name?: string;
      priority?: number;
      metadata?: Record<string, any>;
    }>,
  ) {
    const created = await this.prisma.campaignContact.createMany({
      data: contacts.map((c) => ({
        campaignId,
        phoneNumber: c.phoneNumber,
        name: c.name,
        priority: c.priority || 0,
        metadata: c.metadata ? JSON.stringify(c.metadata) : null,
        status: 'queued',
      })),
    });

    this.logger.log(`Added ${created.count} contacts to campaign ${campaignId}`);
    return created;
  }

  /**
   * Start campaign
   */
  async startCampaign(campaignId: string) {
    const campaign = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'active',
        startTime: new Date(),
      },
    });

    this.logger.log(`Started campaign: ${campaign.name}`);

    // Start calling contacts
    this.processNextContact(campaignId);

    return campaign;
  }

  /**
   * Process next contact in queue
   */
  private async processNextContact(campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign || campaign.status !== 'active') {
      return;
    }

    // Get next contact to call
    const contact = await this.prisma.campaignContact.findFirst({
      where: {
        campaignId,
        status: 'queued',
        attempts: {
          lt: this.prisma.campaignContact.fields.maxAttempts,
        },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    if (!contact) {
      this.logger.log(`No more contacts to call for campaign ${campaignId}`);
      return;
    }

    // Initiate call
    await this.makeOutboundCall(contact.id);

    // Process next after a delay (rate limiting)
    setTimeout(() => this.processNextContact(campaignId), 5000);
  }

  /**
   * Make outbound call to campaign contact
   */
  async makeOutboundCall(campaignContactId: string) {
    try {
      const contact = await this.prisma.campaignContact.findUnique({
        where: { id: campaignContactId },
        include: { campaign: true },
      });

      if (!contact) {
        throw new Error('Campaign contact not found');
      }

      // Update status
      await this.prisma.campaignContact.update({
        where: { id: campaignContactId },
        data: {
          status: 'calling',
          attempts: { increment: 1 },
        },
      });

      // Create campaign call record
      const campaignCall = await this.prisma.campaignCall.create({
        data: {
          campaignId: contact.campaignId,
          campaignContactId,
          status: 'initiated',
        },
      });

      // Initiate Twilio call
      const call = await this.twilioClient.calls.create({
        to: contact.phoneNumber,
        from: this.twilioNumber,
        url: `${this.getBaseUrl()}/voice/twilio/outbound?campaignCallId=${campaignCall.id}`,
        statusCallback: `${this.getBaseUrl()}/voice/twilio/campaign-status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      });

      // Create call record
      const callRecord = await this.prisma.call.create({
        data: {
          sid: call.sid,
          direction: 'OUTBOUND',
          status: 'initiated',
          contactId: contact.contactId,
        },
      });

      // Link campaign call to actual call
      await this.prisma.campaignCall.update({
        where: { id: campaignCall.id },
        data: { callId: callRecord.id },
      });

      this.logger.log(`Initiated call to ${contact.phoneNumber} (${call.sid})`);
      return call;
    } catch (error) {
      this.logger.error(`Failed to make outbound call: ${error.message}`);

      // Update contact status to failed
      await this.prisma.campaignContact.update({
        where: { id: campaignContactId },
        data: { status: 'failed' },
      });

      throw error;
    }
  }

  /**
   * Pause campaign
   */
  async pauseCampaign(campaignId: string) {
    return this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'paused' },
    });
  }

  /**
   * Get campaign statistics
   */
  async getCampaignStats(campaignId: string) {
    const contacts = await this.prisma.campaignContact.groupBy({
      by: ['status'],
      where: { campaignId },
      _count: true,
    });

    const calls = await this.prisma.campaignCall.groupBy({
      by: ['status'],
      where: { campaignId },
      _count: true,
    });

    return {
      contacts: contacts.map((c) => ({
        status: c.status,
        count: c._count,
      })),
      calls: calls.map((c) => ({
        status: c.status,
        count: c._count,
      })),
    };
  }

  private getBaseUrl(): string {
    const env = this.configService.get('NODE_ENV');
    const port = this.configService.get('PORT');

    if (env === 'production') {
      return 'https://YOUR_PRODUCTION_DOMAIN';
    }

    return `http://localhost:${port}`;
  }
}
