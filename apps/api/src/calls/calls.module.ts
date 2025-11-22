import { Module } from '@nestjs/common';
import { CallsController } from './calls.controller';
import { CallsService } from './calls.service';
import { TwilioModule } from '../twilio/twilio.module';

@Module({
  imports: [TwilioModule],
  controllers: [CallsController],
  providers: [CallsService],
})
export class CallsModule {}
