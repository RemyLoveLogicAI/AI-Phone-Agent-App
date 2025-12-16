import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Phase 3: Booking Service
 * Database-backed tool for managing appointments
 */
@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check availability for a given time slot
   */
  async checkAvailability(requestedTime: Date, duration: number = 60): Promise<{
    available: boolean;
    reason?: string;
  }> {
    const dayOfWeek = requestedTime.getDay();
    const timeStr = `${requestedTime.getHours().toString().padStart(2, '0')}:${requestedTime.getMinutes().toString().padStart(2, '0')}`;

    // Check business hours
    const availability = await this.prisma.availability.findFirst({
      where: {
        dayOfWeek,
        isAvailable: true,
      },
    });

    if (!availability) {
      return { available: false, reason: 'Outside business hours' };
    }

    // Check for conflicting bookings
    const endTime = new Date(requestedTime.getTime() + duration * 60000);
    const conflicts = await this.prisma.booking.findMany({
      where: {
        scheduledAt: {
          gte: requestedTime,
          lt: endTime,
        },
        status: {
          in: ['pending', 'confirmed'],
        },
      },
    });

    if (conflicts.length > 0) {
      return { available: false, reason: 'Time slot already booked' };
    }

    return { available: true };
  }

  /**
   * Create a booking
   */
  async createBooking(data: {
    callId?: string;
    contactId?: string;
    serviceType: string;
    scheduledAt: Date;
    duration: number;
    notes?: string;
  }) {
    const { available, reason } = await this.checkAvailability(
      data.scheduledAt,
      data.duration,
    );

    if (!available) {
      throw new Error(`Cannot book: ${reason}`);
    }

    return this.prisma.booking.create({
      data: {
        ...data,
        status: 'pending',
      },
    });
  }

  /**
   * List upcoming bookings
   */
  async listUpcomingBookings(limit: number = 10) {
    return this.prisma.booking.findMany({
      where: {
        scheduledAt: {
          gte: new Date(),
        },
        status: {
          in: ['pending', 'confirmed'],
        },
      },
      orderBy: {
        scheduledAt: 'asc',
      },
      take: limit,
    });
  }
}
